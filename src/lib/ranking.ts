import "server-only";

import { createAdminClient } from "./supabase/admin";

export type BarisRanking = {
  rank: number;
  userId: string;
  nama: string; // sudah disamarkan
  twk: number;
  tiu: number;
  tkp: number;
  total: number;
  lulus: boolean;
};

/** "Tegar Indera" → "Teg***" (SPEC 5.8). */
export function samarkan(nama: string | null | undefined): string {
  const n = (nama ?? "").trim();
  if (!n) return "Pes***";
  return `${n.slice(0, 3)}***`;
}

/**
 * Ranking satu Part: hanya percobaan PERTAMA tiap peserta yang sudah selesai.
 * Urutan: total, lalu TKP, lalu TIU, lalu TWK (SPEC 5.8). Hanya dipanggil di server
 * setelah akses peserta dicek, jadi data Part yang belum dibeli tidak pernah terkirim.
 */
export async function getRanking(partId: string): Promise<BarisRanking[]> {
  const db = createAdminClient();
  const rows: { user_id: string; nilai_twk: number; nilai_tiu: number; nilai_tkp: number; total: number; lulus: boolean }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("attempts")
      .select("user_id, nilai_twk, nilai_tiu, nilai_tkp, total, lulus")
      .eq("part_id", partId)
      .eq("percobaan_ke", 1)
      .not("selesai", "is", null)
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const nama = new Map<string, string | null>();
  for (let i = 0; i < ids.length; i += 500) {
    const { data } = await db.from("profiles").select("id, nama, role").in("id", ids.slice(i, i + 500));
    for (const p of data ?? []) if (p.role !== "admin") nama.set(p.id, p.nama);
  }
  return rows
    .filter((r) => nama.has(r.user_id)) // admin tidak ikut ranking
    .sort(
      (a, b) =>
        b.total - a.total || b.nilai_tkp - a.nilai_tkp || b.nilai_tiu - a.nilai_tiu || b.nilai_twk - a.nilai_twk,
    )
    .map((r, i) => ({
      rank: i + 1,
      userId: r.user_id,
      nama: samarkan(nama.get(r.user_id)),
      twk: r.nilai_twk,
      tiu: r.nilai_tiu,
      tkp: r.nilai_tkp,
      total: r.total,
      lulus: !!r.lulus,
    }));
}

export type Posisi = { rank: number; dari: number; persenTeratas: number; kurangKeTop100: number | null; baris: BarisRanking };

export function posisiPeserta(ranking: BarisRanking[], userId: string): Posisi | null {
  const baris = ranking.find((r) => r.userId === userId);
  if (!baris) return null;
  const dari = ranking.length;
  const top100 = ranking[99];
  return {
    rank: baris.rank,
    dari,
    persenTeratas: Math.max(1, Math.ceil((baris.rank / dari) * 100)),
    kurangKeTop100: baris.rank <= 100 || !top100 ? null : Math.max(1, top100.total - baris.total + 1),
    baris,
  };
}
