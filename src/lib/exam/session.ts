import "server-only";

import { cookies } from "next/headers";
import { EXAM_SETTINGS } from "./settings";
import type { ExamResult } from "./types";

// Tahap 2: percobaan disimpan di cookie httpOnly (tidak bisa dibaca JavaScript di browser).
// Waktu mulai dicatat oleh SERVER, jadi refresh halaman atau mengubah jam HP tidak mengubah sisa waktu.
// Tahap 3: dipindah ke tabel `attempts` & `answers` di Supabase (per akun, autosave ke server).

export type Attempt = { id: string; partId: string; mulai: number };

const attemptCookie = (partId: string) => `sahatu_ujian_${partId}`;
const resultCookie = (partId: string) => `sahatu_hasil_${partId}`;
const base = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };

export const durasiMs = () => EXAM_SETTINGS.durasiMenit * 60_000;
export const deadlineOf = (a: Attempt) => a.mulai + durasiMs();

export async function readAttempt(partId: string): Promise<Attempt | null> {
  const raw = (await cookies()).get(attemptCookie(partId))?.value;
  if (!raw) return null;
  try {
    const a = JSON.parse(raw) as Attempt;
    if (a.partId !== partId || typeof a.mulai !== "number" || typeof a.id !== "string") return null;
    return a;
  } catch {
    return null;
  }
}

export async function startAttempt(partId: string): Promise<Attempt> {
  const a: Attempt = { id: crypto.randomUUID(), partId, mulai: Date.now() };
  (await cookies()).set(attemptCookie(partId), JSON.stringify(a), { ...base, maxAge: 60 * 60 * 24 });
  return a;
}

export async function endAttempt(partId: string) {
  (await cookies()).delete(attemptCookie(partId));
}

export async function saveResult(result: ExamResult) {
  (await cookies()).set(resultCookie(result.partId), JSON.stringify(result), {
    ...base,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function readResult(partId: string): Promise<ExamResult | null> {
  const raw = (await cookies()).get(resultCookie(partId))?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ExamResult;
  } catch {
    return null;
  }
}

/** Jam server sekarang (dipakai browser untuk mengoreksi jam HP). */
export const serverTime = () => Date.now();
