"use server";

import { getActiveUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function reportQuestion(
  attemptId: string,
  questionId: string,
  isi: string,
): Promise<{ ok: boolean; pesan: string }> {
  const r = await getActiveUser({ keluarkan: false });
  if (!r.user) return { ok: false, pesan: "Sesi login berakhir. Silakan masuk lagi." };
  const teks = isi.trim();
  if (teks.length < 5) return { ok: false, pesan: "Tulis minimal 5 huruf, misalnya apa yang salah." };
  if (teks.length > 1000) return { ok: false, pesan: "Maksimal 1000 huruf." };

  const db = createAdminClient();
  const { data: a } = await db.from("attempts").select("user_id, part_id, selesai").eq("id", attemptId).maybeSingle();
  if (!a || a.user_id !== r.user.id || !a.selesai) return { ok: false, pesan: "Percobaan tidak ditemukan." };
  const { data: q } = await db.from("questions").select("id").eq("id", questionId).eq("part_id", a.part_id).maybeSingle();
  if (!q) return { ok: false, pesan: "Soal tidak ditemukan." };

  const { count } = await db
    .from("question_reports")
    .select("id", { count: "exact", head: true })
    .eq("question_id", questionId)
    .eq("user_id", r.user.id)
    .neq("status", "selesai");
  if (count) return { ok: true, pesan: "Kamu sudah melaporkan soal ini. Terima kasih, sedang kami cek." };

  const { error } = await db
    .from("question_reports")
    .insert({ question_id: questionId, user_id: r.user.id, attempt_id: attemptId, isi: teks });
  if (error) return { ok: false, pesan: "Gagal mengirim laporan. Coba lagi." };
  return { ok: true, pesan: "Terima kasih! Laporanmu sudah terkirim ke admin." };
}
