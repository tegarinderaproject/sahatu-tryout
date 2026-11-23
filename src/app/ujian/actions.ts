"use server";

import { notFound, redirect } from "next/navigation";
import { getActiveUser, requireActiveUser } from "@/lib/auth";
import { finalizeAttempt, getPartByKode } from "@/lib/exam/data";
import { getSettings, TOLERANSI_DETIK } from "@/lib/exam/settings";
import type { Label } from "@/lib/exam/types";
import { createAdminClient } from "@/lib/supabase/admin";

const LABELS = new Set(["A", "B", "C", "D", "E"]);

/** Mulai tryout, atau lanjutkan percobaan yang masih berjalan. */
export async function startExam(kode: string) {
  const user = await requireActiveUser(`/tryout/${kode}`);
  const part = await getPartByKode(kode);
  if (!part || (part.status !== "terbit" && user.role !== "admin")) notFound();
  const db = createAdminClient();

  const { data: berjalan } = await db
    .from("attempts")
    .select("id, batas")
    .eq("user_id", user.id)
    .eq("part_id", part.id)
    .is("selesai", null)
    .order("mulai", { ascending: false });
  for (const a of berjalan ?? []) {
    if (new Date(a.batas).getTime() + TOLERANSI_DETIK * 1000 > Date.now()) redirect(`/ujian/${a.id}`);
    await finalizeAttempt(a.id); // waktunya sudah habis tapi belum dikumpulkan
  }

  const settings = await getSettings();
  const { count } = await db
    .from("attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("part_id", part.id);
  const mulai = new Date();
  const { data: baru, error } = await db
    .from("attempts")
    .insert({
      user_id: user.id,
      part_id: part.id,
      mulai: mulai.toISOString(),
      batas: new Date(mulai.getTime() + settings.durasiMenit * 60_000).toISOString(),
      percobaan_ke: (count ?? 0) + 1,
    })
    .select("id")
    .single();
  if (error || !baru) throw new Error("Gagal memulai tryout. Coba lagi.");
  redirect(`/ujian/${baru.id}`);
}

export type SaveResult = { ok: true } | { ok: false; alasan: "habis" | "perangkat-lain" | "tidak-valid" };

/** Autosave satu jawaban ke server (SPEC 4: tersimpan setiap kali dipilih). */
export async function saveAnswer(
  attemptId: string,
  questionId: string,
  label: Label | null,
  ragu: boolean,
): Promise<SaveResult> {
  // Tanpa menghapus cookie di sini, supaya halaman ujian bisa menampilkan pesan "dikeluarkan".
  const r = await getActiveUser({ keluarkan: false });
  if (!r.user) return { ok: false, alasan: "perangkat-lain" };
  if (label !== null && !LABELS.has(label)) return { ok: false, alasan: "tidak-valid" };

  const db = createAdminClient();
  const { data: a } = await db
    .from("attempts")
    .select("id, user_id, part_id, batas, selesai")
    .eq("id", attemptId)
    .maybeSingle();
  if (!a || a.user_id !== r.user.id) return { ok: false, alasan: "tidak-valid" };
  if (a.selesai || Date.now() > new Date(a.batas).getTime() + TOLERANSI_DETIK * 1000) {
    return { ok: false, alasan: "habis" };
  }
  const { data: q } = await db
    .from("questions")
    .select("id")
    .eq("id", questionId)
    .eq("part_id", a.part_id)
    .maybeSingle();
  if (!q) return { ok: false, alasan: "tidak-valid" };

  const { error } = await db.from("answers").upsert({
    attempt_id: attemptId,
    question_id: questionId,
    opsi_dipilih: label,
    ragu,
    diubah: new Date().toISOString(),
  });
  if (error) throw error;
  return { ok: true };
}

/** Kumpulkan: penilaian di server memakai jawaban yang tersimpan di database. */
export async function submitExam(attemptId: string) {
  const user = await requireActiveUser(`/ujian/${attemptId}`);
  const { data: a } = await createAdminClient()
    .from("attempts")
    .select("user_id")
    .eq("id", attemptId)
    .maybeSingle();
  if (!a || a.user_id !== user.id) notFound();
  await finalizeAttempt(attemptId);
  redirect(`/hasil/${attemptId}`);
}

/** Pengecekan cadangan tiap 60 detik: apakah sesi ini masih sesi aktif? */
export async function checkSession(): Promise<boolean> {
  const r = await getActiveUser({ keluarkan: false });
  return !!r.user;
}
