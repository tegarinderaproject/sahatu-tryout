// Membaca alamat & kunci publik Supabase dari environment variable.
// Nilainya diisi di .env.local (laptop) dan di Vercel > Settings > Environment Variables.
// Kunci ini aman dipakai di browser karena data tetap dilindungi RLS.
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}
