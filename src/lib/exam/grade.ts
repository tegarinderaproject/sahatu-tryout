import "server-only";

import type { Part } from "./questions";
import { EXAM_SETTINGS } from "./settings";
import { SUBTES, type Answers, type ExamResult, type SubtesResult } from "./types";

/**
 * Penilaian (SPEC.md bagian 4), dijalankan di server.
 * TWK/TIU: benar = 5, salah/kosong = 0. TKP: nilai = bobot opsi (1–5), kosong = 0.
 * Lulus = ketiga subtes memenuhi passing grade.
 */
export function gradeExam(part: Part, answers: Answers, waktuHabis: boolean): ExamResult {
  const subtes: SubtesResult[] = SUBTES.map((s) => {
    const cfg = EXAM_SETTINGS.subtes[s];
    const qs = part.questions.filter((q) => q.subtes === s);
    let nilai = 0, benar = 0, salah = 0, kosong = 0;
    for (const q of qs) {
      const pilih = answers[q.nomor];
      const opsi = pilih ? q.opsi.find((o) => o.label === pilih) : undefined;
      if (!opsi) {
        kosong++;
      } else if (s === "TKP") {
        nilai += opsi.bobot ?? 0;
        benar++;
      } else if (opsi.benar) {
        nilai += cfg.nilaiBenar;
        benar++;
      } else {
        salah++;
      }
    }
    const maks = qs.length * 5;
    return {
      subtes: s,
      nilai,
      maks,
      passingGrade: cfg.passingGrade,
      lulus: nilai >= cfg.passingGrade,
      benar,
      salah,
      kosong,
      jumlahSoal: qs.length,
    };
  });

  return {
    partId: part.id,
    partNama: part.nama,
    total: subtes.reduce((a, r) => a + r.nilai, 0),
    maks: subtes.reduce((a, r) => a + r.maks, 0),
    lulus: subtes.every((r) => r.lulus),
    subtes,
    selesaiPada: new Date().toISOString(),
    waktuHabis,
  };
}
