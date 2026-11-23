import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Subtes } from "./types";

// Pengaturan ujian (SPEC bagian 4), disimpan di tabel `settings` dan bisa diubah admin.
export type ExamSettings = {
  durasiMenit: number;
  batasGantiPerangkat: number;
  subtes: Record<Subtes, { jumlahSoal: number; passingGrade: number }>;
};

/** Kelonggaran jaringan untuk jawaban yang tersimpan tepat saat waktu habis. */
export const TOLERANSI_DETIK = 30;

export async function getSettings(): Promise<ExamSettings> {
  const { data: s } = await createAdminClient().from("settings").select("*").eq("id", 1).maybeSingle();
  return {
    durasiMenit: s?.durasi_menit ?? 100,
    batasGantiPerangkat: s?.batas_ganti_perangkat ?? 3,
    subtes: {
      TWK: { jumlahSoal: s?.jumlah_twk ?? 30, passingGrade: s?.pg_twk ?? 65 },
      TIU: { jumlahSoal: s?.jumlah_tiu ?? 35, passingGrade: s?.pg_tiu ?? 80 },
      TKP: { jumlahSoal: s?.jumlah_tkp ?? 45, passingGrade: s?.pg_tkp ?? 166 },
    },
  };
}
