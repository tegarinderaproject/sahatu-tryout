import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { requireActiveUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

type Row = {
  id: string;
  mulai: string;
  selesai: string | null;
  nilai_twk: number | null;
  nilai_tiu: number | null;
  nilai_tkp: number | null;
  total: number | null;
  lulus: boolean | null;
  percobaan_ke: number;
  parts: { nama: string } | null;
};

async function Isi() {
  await connection();
  const user = await requireActiveUser("/riwayat");
  const { data } = await createAdminClient()
    .from("attempts")
    .select("id, mulai, selesai, nilai_twk, nilai_tiu, nilai_tkp, total, lulus, percobaan_ke, parts(nama)")
    .eq("user_id", user.id)
    .order("mulai", { ascending: false });
  const rows = (data ?? []) as unknown as Row[];
  const tgl = (s: string) =>
    new Date(s).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

  // Perkembangan per Part: nilai total dari percobaan lama ke baru.
  const perPart = new Map<string, number[]>();
  for (const r of [...rows].reverse()) {
    if (r.total == null) continue;
    const k = r.parts?.nama ?? "-";
    perPart.set(k, [...(perPart.get(k) ?? []), r.total]);
  }

  return (
    <>
      <h1 className="text-3xl font-extrabold text-cocoa">Riwayat tryout</h1>
      {rows.length === 0 && <p className="text-muted">Belum ada percobaan. Mulai dari dashboard.</p>}

      {perPart.size > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-extrabold text-cocoa">Perkembangan nilai total</h2>
          {[...perPart].map(([nama, nilai]) => (
            <div key={nama} className="rounded-2xl border border-beige bg-white p-4">
              <p className="mb-3 font-bold">{nama}</p>
              <div className="flex items-end gap-2 overflow-x-auto" style={{ height: 120 }}>
                {nilai.map((v, i) => (
                  <div key={i} className="flex min-w-9 flex-col items-center gap-1">
                    <span className="text-xs font-bold">{v}</span>
                    <div className="w-7 rounded-t bg-cocoa" style={{ height: Math.max(4, (v / 550) * 80) }} />
                    <span className="text-xs text-muted">#{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-extrabold text-cocoa">Semua percobaan</h2>
        <div className="overflow-x-auto rounded-2xl border border-beige bg-white">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-beige/60 text-cocoa">
              <tr>
                <th className="px-3 py-2.5">Tanggal</th>
                <th className="px-3 py-2.5">Part</th>
                <th className="px-3 py-2.5">TWK</th>
                <th className="px-3 py-2.5">TIU</th>
                <th className="px-3 py-2.5">TKP</th>
                <th className="px-3 py-2.5">Total</th>
                <th className="px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-beige">
                  <td className="px-3 py-2.5">{tgl(r.mulai)}</td>
                  <td className="px-3 py-2.5">
                    {r.parts?.nama} <span className="text-muted">#{r.percobaan_ke}</span>
                  </td>
                  <td className="px-3 py-2.5">{r.nilai_twk ?? "–"}</td>
                  <td className="px-3 py-2.5">{r.nilai_tiu ?? "–"}</td>
                  <td className="px-3 py-2.5">{r.nilai_tkp ?? "–"}</td>
                  <td className="px-3 py-2.5 font-bold">{r.total ?? "–"}</td>
                  <td className="px-3 py-2.5">
                    {r.selesai ? (
                      <span className="flex flex-col gap-0.5">
                        <span className={`font-bold ${r.lulus ? "text-cocoa" : "text-danger"}`}>
                          {r.lulus ? "✓ Lulus" : "✕ Belum lulus"}
                        </span>
                        <span className="flex gap-2 text-xs">
                          <Link href={`/hasil/${r.id}`} className="text-cocoa underline">Hasil</Link>
                          <Link href={`/pembahasan/${r.id}`} className="text-cocoa underline">Pembahasan</Link>
                        </span>
                      </span>
                    ) : (
                      <Link href={`/ujian/${r.id}`} className="font-bold text-cocoa underline">Lanjutkan</Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default function RiwayatPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
        <Suspense fallback={<p className="text-muted">Memuat…</p>}>
          <Isi />
        </Suspense>
      </main>
    </>
  );
}
