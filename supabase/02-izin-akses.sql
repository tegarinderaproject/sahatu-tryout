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
