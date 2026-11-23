import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";

// Client Supabase untuk Server Component, Server Action, dan Route Handler.
// Sesi login disimpan di cookie (dipakai mulai Tahap 3).
export async function createClient() {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY belum diisi.",
    );
  }
  const cookieStore = await cookies();

  return createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Dipanggil dari Server Component: cookie tidak bisa diubah di sini.
          // Aman diabaikan; penyegaran sesi akan ditangani proxy di Tahap 3.
        }
      },
    },
  });
}

// Cek sederhana: apakah server Supabase bisa dihubungi dengan kunci yang dipasang.
export async function checkSupabaseConnection(): Promise<
  "belum-diatur" | "terhubung" | "gagal"
> {
  const env = getSupabaseEnv();
  if (!env) return "belum-diatur";
  try {
    const res = await fetch(`${env.url}/auth/v1/settings`, {
      headers: { apikey: env.key },
      cache: "no-store",
    });
    return res.ok ? "terhubung" : "gagal";
  } catch {
    return "gagal";
  }
}
