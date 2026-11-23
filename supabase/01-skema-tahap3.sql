-- =====================================================================
-- SAHATU Academy — skema database Tahap 3
-- Cara pakai: Supabase > SQL Editor > New query > tempel SELURUH isi file ini > Run.
-- Aman dijalankan ulang (pakai "if not exists" / "or replace").
-- =====================================================================

-- ---------- Profil peserta (1 baris per akun) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nama text,
  role text not null default 'peserta' check (role in ('peserta', 'admin')),
  active_session_id uuid,
  active_device_id text,
  active_sejak timestamptz,
  dibuat timestamptz not null default now()
);

-- Buat profil otomatis setiap ada akun baru.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, nama)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nama', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Riwayat login per perangkat ----------
create table if not exists public.device_logins (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid,
  device_id text not null,
  info_perangkat text,
  ip text,
  waktu_login timestamptz not null default now(),
  dikeluarkan_pada timestamptz,
  alasan text check (alasan in ('login_baru', 'admin', 'logout'))
);
create index if not exists device_logins_user_waktu on public.device_logins (user_id, waktu_login desc);

-- ---------- Paket soal ----------
create table if not exists public.parts (
  id uuid primary key default gen_random_uuid(),
  kode text not null unique,           -- contoh: p0, p1 (dipakai di alamat web)
  nama text not null,
  deskripsi text,
  harga integer not null default 10000,
  status text not null default 'draft' check (status in ('draft', 'terbit')),
  dibuat timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references public.parts (id) on delete cascade,
  nomor integer not null,
  subtes text not null check (subtes in ('TWK', 'TIU', 'TKP')),
  kategori text,
  soal text not null,
  gambar text,
  pembahasan text not null,
  unique (part_id, nomor)
);

create table if not exists public.options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  label text not null check (label in ('A', 'B', 'C', 'D', 'E')),
  teks text,
  gambar text,
  benar boolean not null default false,   -- rahasia: hanya dibaca server
  bobot smallint check (bobot between 1 and 5), -- rahasia: hanya dibaca server
  unique (question_id, label)
);

-- ---------- Percobaan & jawaban ----------
create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  part_id uuid not null references public.parts (id) on delete cascade,
  mulai timestamptz not null default now(),
  batas timestamptz not null,
  selesai timestamptz,
  nilai_twk integer,
  nilai_tiu integer,
  nilai_tkp integer,
  total integer,
  lulus boolean,
  waktu_habis boolean,
  rincian jsonb,
  percobaan_ke integer not null default 1
);
create index if not exists attempts_user_part on public.attempts (user_id, part_id, mulai desc);

create table if not exists public.answers (
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  opsi_dipilih text check (opsi_dipilih in ('A', 'B', 'C', 'D', 'E')),
  ragu boolean not null default false,
  diubah timestamptz not null default now(),
  primary key (attempt_id, question_id)
);

-- ---------- Pengaturan (1 baris) ----------
create table if not exists public.settings (
  id integer primary key default 1 check (id = 1),
  durasi_menit integer not null default 100,
  jumlah_twk integer not null default 30,
  jumlah_tiu integer not null default 35,
  jumlah_tkp integer not null default 45,
  pg_twk integer not null default 65,
  pg_tiu integer not null default 80,
  pg_tkp integer not null default 166,
  batas_ganti_perangkat integer not null default 3
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ---------- Row Level Security ----------
-- Semua tabel dikunci. Peserta hanya bisa MEMBACA data miliknya sendiri.
-- Semua penulisan (dan pembacaan kunci jawaban) hanya lewat server memakai secret key.
alter table public.profiles enable row level security;
alter table public.device_logins enable row level security;
alter table public.parts enable row level security;
alter table public.questions enable row level security;
alter table public.options enable row level security;
alter table public.attempts enable row level security;
alter table public.answers enable row level security;
alter table public.settings enable row level security;

drop policy if exists "profil sendiri" on public.profiles;
create policy "profil sendiri" on public.profiles for select to authenticated using (id = (select auth.uid()));

drop policy if exists "login sendiri" on public.device_logins;
create policy "login sendiri" on public.device_logins for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "part terbit" on public.parts;
create policy "part terbit" on public.parts for select using (status = 'terbit');

drop policy if exists "percobaan sendiri" on public.attempts;
create policy "percobaan sendiri" on public.attempts for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "jawaban sendiri" on public.answers;
create policy "jawaban sendiri" on public.answers for select to authenticated
  using (exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = (select auth.uid())));

drop policy if exists "pengaturan dibaca" on public.settings;
create policy "pengaturan dibaca" on public.settings for select to authenticated using (true);
-- questions & options sengaja TANPA policy: tidak bisa dibaca langsung dari browser sama sekali.

-- ---------- Realtime: perangkat lama langsung tahu kalau dikeluarkan ----------
do $$ begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null; end $$;

-- ---------- Storage: gambar soal ----------
insert into storage.buckets (id, name, public) values ('soal', 'soal', true)
on conflict (id) do nothing;
-- =====================================================================
-- SAHATU Academy — izin akses tabel (jalankan SETELAH 01-skema-tahap3.sql)
-- Proyek Supabase baru tidak otomatis memberi izin tabel ke API.
-- Cara pakai: Supabase > SQL Editor > New query > tempel seluruh isi file ini > Run.
-- =====================================================================

grant usage on schema public to anon, authenticated, service_role;

-- Server (secret key) boleh semuanya.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Pengunjung & peserta: hanya BACA tabel tertentu, dan RLS tetap membatasi barisnya.
grant select on public.parts to anon, authenticated;
grant select on public.profiles, public.device_logins, public.attempts, public.answers, public.settings to authenticated;
-- questions & options sengaja TIDAK diberi izin ke anon/authenticated (kunci jawaban aman).
