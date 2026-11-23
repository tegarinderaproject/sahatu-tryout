import "server-only";

import soalP0 from "@/data/soal-p0.json";
import type { Label, PublicQuestion, Subtes } from "./types";

// Data lengkap (termasuk kunci & bobot). File ini hanya boleh dipakai di server.
type FullQuestion = {
  nomor: number;
  subtes: Subtes;
  kategori: string | null;
  soal: string;
  gambar: string | null;
  opsi: { label: Label; teks: string | null; gambar: string | null; benar: boolean; bobot: number | null }[];
  pembahasan: string;
};

export type Part = { id: string; nama: string; imageBase: string; questions: FullQuestion[] };

const PARTS: Record<string, Part> = {
  p0: {
    id: "p0",
    nama: "Part P0 (soal contoh)",
    imageBase: "/soal/p0/",
    questions: soalP0 as FullQuestion[],
  },
};

export function getPart(id: string): Part | null {
  return PARTS[id] ?? null;
}

/** Buang kunci, bobot, kategori, dan pembahasan sebelum dikirim ke browser. */
export function toPublicQuestions(part: Part): PublicQuestion[] {
  const img = (name: string | null) => (name ? part.imageBase + name : null);
  return part.questions.map((q) => ({
    nomor: q.nomor,
    subtes: q.subtes,
    soal: q.soal,
    gambar: img(q.gambar),
    opsi: q.opsi.map((o) => ({ label: o.label, teks: o.teks, gambar: img(o.gambar) })),
  }));
}
