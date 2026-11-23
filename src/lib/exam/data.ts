import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { gradeExam, type GradeQuestion } from "./grade";
import { getSettings, TOLERANSI_DETIK } from "./settings";
import type { Label, PublicQuestion, Subtes } from "./types";

export type PartRow = {
  id: string;
  kode: string;
  nama: string;
  deskripsi: string | null;
  harga: number;
  status: "draft" | "terbit";
};

export function imageUrl(partId: string, name: string | null): string | null {
  if (!name) return null;
  const env = getSupabaseEnv();
  return `${env?.url}/storage/v1/object/public/soal/${partId}/${encodeURIComponent(name)}`;
}

export async function getPartByKode(kode: string): Promise<PartRow | null> {
  const { data } = await createAdminClient()
    .from("parts")
    .select("id, kode, nama, deskripsi, harga, status")
    .eq("kode", kode.toLowerCase())
    .maybeSingle();
  return (data as PartRow) ?? null;
}

/** Soal untuk browser: TANPA kolom benar, bobot, kategori, pembahasan. */
export async function getPublicQuestions(partId: string): Promise<PublicQuestion[]> {
  const { data, error } = await createAdminClient()
    .from("questions")
    .select("id, nomor, subtes, soal, gambar, options(label, teks, gambar)")
    .eq("part_id", partId)
    .order("nomor");
  if (error) throw error;
  return (data ?? []).map((q) => ({
    id: q.id,
    nomor: q.nomor,
    subtes: q.subtes as Subtes,
    soal: q.soal,
    gambar: imageUrl(partId, q.gambar),
    opsi: [...(q.options ?? [])]
      .sort((a, b) => a.label.localeCompare(b.label))
      .map((o) => ({ label: o.label as Label, teks: o.teks, gambar: imageUrl(partId, o.gambar) })),
  }));
}

export type AttemptRow = {
  id: string;
  user_id: string;
  part_id: string;
  mulai: string;
  batas: string;
  selesai: string | null;
};

/** Kumpulkan & nilai percobaan memakai jawaban yang TERSIMPAN DI SERVER. Aman dipanggil berkali-kali. */
export async function finalizeAttempt(attemptId: string) {
  const db = createAdminClient();
  const { data: attempt } = await db
    .from("attempts")
    .select("id, user_id, part_id, mulai, batas, selesai")
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt || attempt.selesai) return;

  const batas = new Date(attempt.batas).getTime();
  const sekarang = Date.now();
  const waktuHabis = sekarang >= batas;
  const batasSimpan = new Date(batas + TOLERANSI_DETIK * 1000).toISOString();

  const [{ data: qs }, { data: ans }, settings] = await Promise.all([
    db.from("questions").select("id, subtes, options(label, benar, bobot)").eq("part_id", attempt.part_id),
    db
      .from("answers")
      .select("question_id, opsi_dipilih")
      .eq("attempt_id", attemptId)
      .lte("diubah", batasSimpan)
      .not("opsi_dipilih", "is", null),
    getSettings(),
  ]);
  const answers = new Map<string, Label>((ans ?? []).map((a) => [a.question_id, a.opsi_dipilih as Label]));
  const gradeQs: GradeQuestion[] = (qs ?? []).map((q) => ({
    id: q.id,
    subtes: q.subtes as Subtes,
    opsi: (q.options ?? []).map((o) => ({ label: o.label as Label, benar: !!o.benar, bobot: o.bobot })),
  }));
  const r = gradeExam(gradeQs, answers, settings);
  const nilai = (s: Subtes) => r.subtes.find((x) => x.subtes === s)!.nilai;

  await db
    .from("attempts")
    .update({
      selesai: new Date(Math.min(sekarang, batas)).toISOString(),
      nilai_twk: nilai("TWK"),
      nilai_tiu: nilai("TIU"),
      nilai_tkp: nilai("TKP"),
      total: r.total,
      lulus: r.lulus,
      waktu_habis: waktuHabis,
      rincian: r.subtes,
    })
    .eq("id", attemptId)
    .is("selesai", null);
}
