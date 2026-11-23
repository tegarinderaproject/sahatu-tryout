import type { ExamSettings } from "./settings";
import { SUBTES, type Label, type SubtesResult, type Subtes } from "./types";

export type GradeQuestion = {
  id: string;
  subtes: Subtes;
  opsi: { label: Label; benar: boolean; bobot: number | null }[];
};

/**
 * Penilaian (SPEC bagian 4), dijalankan di server.
 * TWK/TIU: benar = 5, salah/kosong = 0. TKP: nilai = bobot opsi (1–5), kosong = 0.
 * Lulus = ketiga subtes memenuhi passing grade.
 */
export function gradeExam(questions: GradeQuestion[], answers: Map<string, Label>, settings: ExamSettings) {
  const subtes: SubtesResult[] = SUBTES.map((s) => {
    const qs = questions.filter((q) => q.subtes === s);
    let nilai = 0, benar = 0, salah = 0, kosong = 0;
    for (const q of qs) {
      const pilih = answers.get(q.id);
      const opsi = pilih ? q.opsi.find((o) => o.label === pilih) : undefined;
      if (!opsi) kosong++;
      else if (s === "TKP") {
        nilai += opsi.bobot ?? 0;
        benar++;
      } else if (opsi.benar) {
        nilai += 5;
        benar++;
      } else salah++;
    }
    const pg = settings.subtes[s].passingGrade;
    return {
      subtes: s,
      nilai,
      maks: qs.length * 5,
      passingGrade: pg,
      lulus: nilai >= pg,
      benar,
      salah,
      kosong,
      jumlahSoal: qs.length,
    };
  });
  return {
    subtes,
    total: subtes.reduce((a, r) => a + r.nilai, 0),
    maks: subtes.reduce((a, r) => a + r.maks, 0),
    lulus: subtes.every((r) => r.lulus),
  };
}
