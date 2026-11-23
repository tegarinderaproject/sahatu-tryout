"use server";

import { redirect } from "next/navigation";
import { getPart } from "@/lib/exam/questions";
import { gradeExam } from "@/lib/exam/grade";
import { EXAM_SETTINGS } from "@/lib/exam/settings";
import { deadlineOf, endAttempt, readAttempt, saveResult, startAttempt } from "@/lib/exam/session";
import type { Answers, Label } from "@/lib/exam/types";

const LABELS = new Set<Label>(["A", "B", "C", "D", "E"]);

/** Mulai tryout, atau lanjutkan percobaan yang masih berjalan. */
export async function startExam(partId: string) {
  if (!getPart(partId)) redirect("/");
  const current = await readAttempt(partId);
  if (!current || Date.now() > deadlineOf(current) + EXAM_SETTINGS.toleransiDetik * 1000) {
    await startAttempt(partId);
  }
  redirect(`/tryout/${partId}/ujian`);
}

/** Kumpulkan jawaban. Penilaian dilakukan di sini (server), kunci tidak pernah dikirim ke browser. */
export async function submitExam(partId: string, attemptId: string, raw: Record<string, string>) {
  const part = getPart(partId);
  if (!part) redirect("/");
  const attempt = await readAttempt(partId);
  if (!attempt || attempt.id !== attemptId) {
    // Percobaan sudah dikumpulkan (mis. tombol ditekan dua kali) atau tidak dikenal.
    redirect(`/tryout/${partId}/hasil`);
  }

  // Ambil hanya jawaban yang valid: nomor soal yang ada dan huruf A–E.
  const nomorValid = new Set(part.questions.map((q) => q.nomor));
  const answers: Answers = {};
  for (const [k, v] of Object.entries(raw ?? {})) {
    const n = Number(k);
    if (nomorValid.has(n) && LABELS.has(v as Label)) answers[n] = v as Label;
  }

  const waktuHabis = Date.now() >= deadlineOf(attempt);
  await saveResult(gradeExam(part, answers, waktuHabis));
  await endAttempt(partId);
  redirect(`/tryout/${partId}/hasil`);
}
