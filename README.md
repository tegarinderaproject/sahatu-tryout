# SAHATU Academy — Web Tryout SKD CPNS

Acuan lengkap ada di [SPEC.md](SPEC.md). Teknologi: Next.js (App Router) + TypeScript + Tailwind CSS + Supabase, di-hosting di Vercel.

## Menjalankan di laptop

1. Install [Node.js](https://nodejs.org) versi LTS (sekali saja).
2. Di folder ini, jalankan `npm install` (sekali saja, atau setiap ada paket baru).
3. Salin `.env.example` menjadi `.env.local`, lalu isi nilainya dari dashboard Supabase.
4. Jalankan `npm run dev`, buka http://localhost:3000.

Halaman depan menampilkan status koneksi Supabase:
- **✓ Supabase terhubung**: semua beres.
- **! belum diatur**: `.env.local` belum diisi (atau server belum di-restart setelah diisi).
- **✕ gagal dihubungi**: URL atau kunci salah.

## Environment variable

| Nama | Dipakai di | Rahasia? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | Tidak |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | browser + server | Tidak (data dilindungi RLS) |
| `SUPABASE_SECRET_KEY` | server saja (mulai Tahap 3) | **Ya** |

Isi di `.env.local` (laptop) dan di Vercel > Project > Settings > Environment Variables. Setelah mengubah variabel di Vercel, lakukan **Redeploy**.

`.env.local` tidak pernah ikut ke GitHub (sudah diatur di `.gitignore`).
