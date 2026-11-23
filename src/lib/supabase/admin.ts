import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

// Client dengan SECRET KEY: melewati RLS. HANYA untuk kode server
// (server action, route handler, server component). Jangan pernah diimpor dari komponen "use client".
export function createAdminClient() {
  const env = getSupabaseEnv();
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!env || !secret) {
    throw new Error("SUPABASE_SECRET_KEY belum diisi di .env.local / Vercel.");
  }
  return createClient(env.url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
