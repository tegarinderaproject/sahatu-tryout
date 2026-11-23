import type { Subtes } from "./types";

// Pengaturan ujian (SPEC.md bagian 4). Mulai Tahap 3 disimpan di tabel `settings`
// supaya bisa diubah admin tanpa ubah kode.
export const EXAM_SETTINGS = {
  durasiMenit: 100,
  subtes: {
    TWK: { jumlahSoal: 30, passingGrade: 65, nilaiBenar: 5 },
    TIU: { jumlahSoal: 35, passingGrade: 80, nilaiBenar: 5 },
    TKP: { jumlahSoal: 45, passingGrade: 166, nilaiBenar: 5 },
  } satisfies Record<Subtes, { jumlahSoal: number; passingGrade: number; nilaiBenar: number }>,
  /** Kelonggaran jaringan saat mengumpulkan setelah waktu habis. */
  toleransiDetik: 30,
};
