import { Suspense } from "react";
import { connection } from "next/server";
import { checkSupabaseConnection } from "@/lib/supabase/server";

// Halaman sementara Tahap 1. Akan diganti landing page di Tahap 7.

const statusText = {
  terhubung: { label: "Supabase terhubung", tone: "bg-beige text-cocoa", icon: "✓" },
  "belum-diatur": {
    label: "Supabase belum diatur (isi environment variable)",
    tone: "bg-beige text-muted",
    icon: "!",
  },
  gagal: {
    label: "Supabase gagal dihubungi (cek URL dan kunci)",
    tone: "bg-danger/10 text-danger",
    icon: "✕",
  },
} as const;

async function SupabaseStatus() {
  await connection(); // cek ulang setiap kali halaman dibuka
  const status = statusText[await checkSupabaseConnection()];
  return (
    <p
      className={`mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${status.tone}`}
    >
      <span aria-hidden>{status.icon}</span>
      {status.label}
    </p>
  );
}

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-5 py-16">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-beige">
        <div className="mx-auto mb-6 h-2 w-16 rounded-full bg-caramel" aria-hidden />
        <h1 className="text-2xl font-bold text-cocoa">SAHATU Academy</h1>
        <p className="mt-2 text-muted">
          Tryout SKD CPNS sedang disiapkan. Satu Hari Satu Soal.
        </p>
        <Suspense
          fallback={
            <p className="mt-6 inline-flex rounded-full bg-beige px-4 py-2 text-sm text-muted">
              Mengecek koneksi Supabase…
            </p>
          }
        >
          <SupabaseStatus />
        </Suspense>
      </div>
    </main>
  );
}
