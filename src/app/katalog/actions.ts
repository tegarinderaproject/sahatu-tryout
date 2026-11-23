"use server";

import { revalidatePath } from "next/cache";
import { formatTanggal } from "@/lib/access";
import { getActiveUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type VoucherState = { ok?: string; error?: string; pilihPart?: boolean };

export async function tukarVoucher(_: VoucherState, form: FormData): Promise<VoucherState> {
  const r = await getActiveUser();
  if (!r.user) return { error: "Masuk dulu untuk menukar voucher." };
  const kode = String(form.get("kode") ?? "").trim().toUpperCase();
  const partId = String(form.get("part_id") ?? "") || null;
  if (!kode) return { error: "Isi kode voucher." };

  const db = createAdminClient();
  const { data, error } = await db.rpc("redeem_voucher", { p_user: r.user.id, p_kode: kode, p_part: partId });
  if (error) return { error: "Gagal menukar voucher. Coba lagi." };
  const res = data as { ok: boolean; pesan?: string; part_id?: string; berlaku_sampai?: string; pilih_part?: boolean };
  if (!res.ok) return { error: res.pesan, pilihPart: !!res.pilih_part };

  const { data: part } = await db.from("parts").select("nama").eq("id", res.part_id!).single();
  revalidatePath("/katalog");
  revalidatePath("/dashboard");
  return { ok: `Berhasil! ${part?.nama} terbuka sampai ${formatTanggal(res.berlaku_sampai!)}.` };
}
