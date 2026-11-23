import "server-only";

import { redirect } from "next/navigation";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";

export const PESAN_PERANGKAT_LAIN =
  "Akunmu baru saja masuk di perangkat lain, jadi kamu dikeluarkan dari perangkat ini. Kalau itu bukan kamu, segera ganti password.";

export type ActiveUser = {
  id: string;
  email: string | null;
  sessionId: string;
  nama: string | null;
  role: "peserta" | "admin";
};

/**
 * Ambil pengguna yang login DAN sesinya masih sesi aktif (SPEC 5.1).
 * - null + "belum-login": tidak ada sesi.
 * - null + "perangkat-lain": akun sudah login di perangkat lain; sesi di sini dihapus.
 */
export async function getActiveUser(): Promise<
  { user: ActiveUser; alasan?: undefined } | { user: null; alasan: "belum-login" | "perangkat-lain" }
> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return { user: null, alasan: "belum-login" };

  const { data: profile } = await createAdminClient()
    .from("profiles")
    .select("nama, role, active_session_id")
    .eq("id", claims.sub)
    .maybeSingle();

  const sessionId = String(claims.session_id ?? "");
  if (profile?.active_session_id && profile.active_session_id !== sessionId) {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* dipanggil dari Server Component: cookie tidak bisa dihapus di sini, proxy akan menyusul */
    }
    return { user: null, alasan: "perangkat-lain" };
  }

  return {
    user: {
      id: claims.sub,
      email: (claims.email as string | undefined) ?? null,
      sessionId,
      nama: profile?.nama ?? null,
      role: profile?.role === "admin" ? "admin" : "peserta",
    },
  };
}

/** Untuk halaman & aksi yang butuh login: arahkan ke /masuk kalau tidak memenuhi. */
export async function requireActiveUser(lanjut = "/dashboard"): Promise<ActiveUser> {
  const r = await getActiveUser();
  if (!r.user) {
    const q = new URLSearchParams({ lanjut });
    if (r.alasan === "perangkat-lain") q.set("alasan", "perangkat-lain");
    redirect(`/masuk?${q}`);
  }
  return r.user;
}

export async function requireAdmin(): Promise<ActiveUser> {
  const user = await requireActiveUser("/admin");
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}
