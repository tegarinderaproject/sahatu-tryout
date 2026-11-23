-- =====================================================================
-- SAHATU Academy — Tahap 7: admin perangkat & sesi, ranking
-- Cara pakai: Supabase > SQL Editor > New query > tempel seluruh isi file ini > Run.
-- =====================================================================

-- Admin bisa "reset batas ganti perangkat": login sebelum waktu ini tidak dihitung lagi.
alter table public.profiles add column if not exists reset_batas_at timestamptz;

-- Admin bisa "keluarkan dari semua perangkat": hapus semua sesi login akun itu.
create or replace function public.revoke_sessions(p_user uuid)
returns void language sql security definer set search_path = '' as $$
  delete from auth.sessions where user_id = p_user;
$$;
revoke execute on function public.revoke_sessions(uuid) from public, anon, authenticated;
grant execute on function public.revoke_sessions(uuid) to service_role;

-- Mempercepat ranking (percobaan pertama yang sudah selesai per Part).
create index if not exists attempts_ranking on public.attempts (part_id, percobaan_ke) where selesai is not null;
create index if not exists device_logins_waktu on public.device_logins (waktu_login desc);
