-- =====================================================================
-- SAHATU Academy — Tahap 4: laporan soal dari peserta
-- Cara pakai: Supabase > SQL Editor > New query > tempel seluruh isi file ini > Run.
-- =====================================================================
create table if not exists public.question_reports (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  attempt_id uuid references public.attempts (id) on delete set null,
  isi text not null check (char_length(isi) between 5 and 1000),
  status text not null default 'baru' check (status in ('baru', 'diproses', 'selesai')),
  catatan_admin text,
  dibuat timestamptz not null default now()
);
create index if not exists question_reports_status on public.question_reports (status, dibuat desc);

-- Dikunci: hanya server (secret key) yang membaca & menulis.
alter table public.question_reports enable row level security;
grant all on public.question_reports to service_role;
