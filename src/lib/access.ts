import "server-only";

import type { ActiveUser } from "./auth";
import { createAdminClient } from "./supabase/admin";

export type Akses = { aktif: boolean; berlakuSampai: string | null };

/** Akses peserta ke satu Part. Admin selalu punya akses. Berakhir TEPAT di `berlaku_sampai`. */
export async function getAkses(user: ActiveUser, partId: string): Promise<Akses> {
  if (user.role === "admin") return { aktif: true, berlakuSampai: null };
  const { data } = await createAdminClient()
    .from("entitlements")
    .select("berlaku_sampai")
    .eq("user_id", user.id)
    .eq("part_id", partId)
    .maybeSingle();
  if (!data) return { aktif: false, berlakuSampai: null };
  return { aktif: new Date(data.berlaku_sampai).getTime() > Date.now(), berlakuSampai: data.berlaku_sampai };
}

/** Semua akses milik peserta: part_id → tanggal berakhir. */
export async function getSemuaAkses(userId: string): Promise<Map<string, string>> {
  const { data } = await createAdminClient()
    .from("entitlements")
    .select("part_id, berlaku_sampai")
    .eq("user_id", userId);
  return new Map((data ?? []).map((e) => [e.part_id, e.berlaku_sampai]));
}

export const formatTanggal = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });

/** true kalau tanggal berakhir masih di masa depan. */
export const masihAktif = (iso: string | null | undefined) => !!iso && new Date(iso).getTime() > Date.now();
