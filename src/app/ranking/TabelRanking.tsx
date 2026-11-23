"use client";

import { useState } from "react";

type Baris = { rank: number; nama: string; twk: number; tiu: number; tkp: number; total: number; lulus: boolean; saya: boolean };

export function TabelRanking({ rows, partNama }: { rows: Baris[]; partNama: string }) {
  const [semua, setSemua] = useState(false);
  const tampil = semua ? rows : rows.slice(0, 10);
  return (
    <section aria-labelledby="tabel" className="flex flex-col gap-3 rounded-2xl border border-beige bg-white p-4 sm:p-6">
      <h2 id="tabel" className="text-lg font-extrabold text-cocoa">
        Top {semua ? rows.length : Math.min(10, rows.length)} · {partNama}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm tabular-nums sm:text-base">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="border-b-2 border-beige px-2 py-2">#</th>
              <th className="border-b-2 border-beige px-2 py-2">Peserta</th>
              <th className="border-b-2 border-beige px-2 py-2 text-right">TWK</th>
              <th className="border-b-2 border-beige px-2 py-2 text-right">TIU</th>
              <th className="border-b-2 border-beige px-2 py-2 text-right">TKP</th>
              <th className="border-b-2 border-beige px-2 py-2 text-right">Total</th>
              <th className="border-b-2 border-beige px-2 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {tampil.map((r) => (
              <tr key={r.rank} className={r.saya ? "bg-beige/60" : ""}>
                <td className="border-b border-cream px-2 py-2.5 font-extrabold text-cocoa">{r.rank}</td>
                <td className="border-b border-cream px-2 py-2.5 font-semibold">
                  {r.nama}
                  {r.saya && <span className="ml-1 text-xs text-cocoa">(kamu)</span>}
                </td>
                <td className="border-b border-cream px-2 py-2.5 text-right">{r.twk}</td>
                <td className="border-b border-cream px-2 py-2.5 text-right">{r.tiu}</td>
                <td className="border-b border-cream px-2 py-2.5 text-right">{r.tkp}</td>
                <td className="border-b border-cream px-2 py-2.5 text-right font-extrabold">{r.total}</td>
                <td className={`border-b border-cream px-2 py-2.5 font-bold ${r.lulus ? "text-cocoa" : "text-danger"}`}>
                  {r.lulus ? "✓ Lulus PG" : "✕ Belum"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 10 && (
        <button
          type="button"
          onClick={() => setSemua(!semua)}
          className="self-center rounded-xl border-2 border-cocoa px-5 py-2.5 font-bold text-cocoa"
        >
          {semua ? "Tampilkan 10 besar" : `Tampilkan ${rows.length} besar`}
        </button>
      )}
    </section>
  );
}
