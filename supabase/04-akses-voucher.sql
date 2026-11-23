-- =====================================================================
-- SAHATU Academy — Tahap 5: akses per Part (entitlement), voucher, bundling
-- Cara pakai: Supabase > SQL Editor > New query > tempel seluruh isi file ini > Run.
-- =====================================================================

-- Part boleh berstatus "segera" (tampil di katalog sebagai "Segera hadir", belum bisa dibeli).
alter table public.parts drop constraint if exists parts_status_check;
alter table public.parts add constraint parts_status_check check (status in ('draft', 'segera', 'terbit'));
drop policy if exists "part terbit" on public.parts;
create policy "part terbit" on public.parts for select using (status in ('terbit', 'segera'));

-- ---------- Akses peserta per Part ----------
create table if not exists public.entitlements (
  user_id uuid not null references auth.users (id) on delete cascade,
  part_id uuid not null references public.parts (id) on delete cascade,
  sumber text not null check (sumber in ('order', 'voucher', 'manual')),
  berlaku_sampai timestamptz not null,
  diperbarui timestamptz not null default now(),
  primary key (user_id, part_id)
);

-- ---------- Voucher ----------
create table if not exists public.vouchers (
  kode text primary key check (kode = upper(kode)),
  part_id uuid references public.parts (id) on delete set null, -- kosong = peserta pilih Part sendiri
  kuota integer not null default 1 check (kuota > 0),
  terpakai integer not null default 0,
  aktif boolean not null default true,
  masa_akses_hari integer not null default 365,
  berlaku_hingga timestamptz,                                      -- batas terakhir kode bisa ditukar (opsional)
  catatan text,
  dibuat timestamptz not null default now()
);
create table if not exists public.voucher_redemptions (
  id bigint generated always as identity primary key,
  kode text not null references public.vouchers (kode) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  part_id uuid not null references public.parts (id) on delete cascade,
  waktu timestamptz not null default now(),
  unique (kode, user_id)
);

-- ---------- Bundling ----------
create table if not exists public.bundles (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  deskripsi text,
  harga integer not null,
  status text not null default 'draft' check (status in ('draft', 'terbit')),
  dibuat timestamptz not null default now()
);
create table if not exists public.bundle_parts (
  bundle_id uuid not null references public.bundles (id) on delete cascade,
  part_id uuid not null references public.parts (id) on delete cascade,
  primary key (bundle_id, part_id)
);

-- ---------- Fungsi: beri / perpanjang akses ----------
-- Kalau akses masih aktif, diperpanjang dari tanggal berakhir yang lama (SPEC 3).
create or replace function public.grant_access(p_user uuid, p_part uuid, p_sumber text, p_hari integer)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare v_sampai timestamptz;
begin
  insert into public.entitlements as e (user_id, part_id, sumber, berlaku_sampai)
  values (p_user, p_part, p_sumber, now() + make_interval(days => p_hari))
  on conflict (user_id, part_id) do update
    set berlaku_sampai = greatest(e.berlaku_sampai, now()) + make_interval(days => p_hari),
        sumber = excluded.sumber,
        diperbarui = now()
  returning berlaku_sampai into v_sampai;
  return v_sampai;
end;
$$;

-- ---------- Fungsi: tukar voucher (atomik, aman dari klik ganda) ----------
create or replace function public.redeem_voucher(p_user uuid, p_kode text, p_part uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v public.vouchers%rowtype;
  v_part uuid;
  v_sampai timestamptz;
begin
  select * into v from public.vouchers where kode = upper(trim(p_kode)) for update;
  if not found or not v.aktif then
    return jsonb_build_object('ok', false, 'pesan', 'Kode voucher tidak ditemukan atau sudah tidak aktif.');
  end if;
  if v.berlaku_hingga is not null and v.berlaku_hingga < now() then
    return jsonb_build_object('ok', false, 'pesan', 'Kode voucher sudah kedaluwarsa.');
  end if;
  if v.terpakai >= v.kuota then
    return jsonb_build_object('ok', false, 'pesan', 'Kuota voucher ini sudah habis.');
  end if;
  if exists (select 1 from public.voucher_redemptions where kode = v.kode and user_id = p_user) then
    return jsonb_build_object('ok', false, 'pesan', 'Kamu sudah pernah memakai kode ini.');
  end if;
  v_part := coalesce(v.part_id, p_part);
  if v_part is null or not exists (select 1 from public.parts where id = v_part and status = 'terbit') then
    return jsonb_build_object('ok', false, 'pesan', 'Pilih Part yang ingin dibuka dengan voucher ini.', 'pilih_part', true);
  end if;

  insert into public.voucher_redemptions (kode, user_id, part_id) values (v.kode, p_user, v_part);
  update public.vouchers set terpakai = terpakai + 1 where kode = v.kode;
  v_sampai := public.grant_access(p_user, v_part, 'voucher', v.masa_akses_hari);
  return jsonb_build_object('ok', true, 'part_id', v_part, 'berlaku_sampai', v_sampai);
end;
$$;

-- ---------- Keamanan ----------
alter table public.entitlements enable row level security;
alter table public.vouchers enable row level security;
alter table public.voucher_redemptions enable row level security;
alter table public.bundles enable row level security;
alter table public.bundle_parts enable row level security;

drop policy if exists "akses sendiri" on public.entitlements;
create policy "akses sendiri" on public.entitlements for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "bundling terbit" on public.bundles;
create policy "bundling terbit" on public.bundles for select using (status = 'terbit');
drop policy if exists "isi bundling" on public.bundle_parts;
create policy "isi bundling" on public.bundle_parts for select using (true);

grant all on public.entitlements, public.vouchers, public.voucher_redemptions, public.bundles, public.bundle_parts to service_role;
grant select on public.entitlements to authenticated;
grant select on public.bundles, public.bundle_parts to anon, authenticated;
-- vouchers & voucher_redemptions: tidak ada akses dari browser.

-- Fungsi hanya boleh dipanggil server (secret key), bukan dari browser.
revoke execute on function public.grant_access(uuid, uuid, text, integer) from public, anon, authenticated;
revoke execute on function public.redeem_voucher(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.grant_access(uuid, uuid, text, integer) to service_role;
grant execute on function public.redeem_voucher(uuid, text, uuid) to service_role;
