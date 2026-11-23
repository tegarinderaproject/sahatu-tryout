"use client";

import { useMemo, useState } from "react";
import type { Label, Subtes } from "@/lib/exam/types";
import { reportQuestion } from "../actions";

export type ItemPembahasan = {
  id: string;
  nomor: number;
  subtes: Subtes;
  kategori: string | null;
  soal: string;
  gambar: string | null;
  pembahasan: string;
  pilih: Label | null;
  ragu: boolean;
  poin: number;
  status: "benar" | "salah" | "kosong" | "tkp";
  opsi: { label: Label; teks: string | null; gambar: string | null; benar: boolean; bobot: number | null }[];
};

type Filter = "semua" | "salah" | "kosong" | "ragu" | Subtes;
const PER_HALAMAN = 10;

function Gambar({ src, alt, besar }: { src: string; alt: string; besar?: boolean }) {
  return (
    <a href={src} target="_blank" rel="noreferrer" aria-label={`${alt}, buka ukuran penuh`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- ukuran gambar soal bervariasi */}
      <img
        src={src}
        alt={alt}
        className={`rounded-lg border border-beige bg-white ${besar ? "max-h-72 w-auto max-w-full" : "h-20 w-auto sm:h-24"}`}
      />
    </a>
  );
}

function Laporkan({ attemptId, questionId }: { attemptId: string; questionId: string }) {
  const [buka, setBuka] = useState(false);
  const [isi, setIsi] = useState("");
  const [hasil, setHasil] = useState<{ ok: boolean; pesan: string } | null>(null);
  const [kirim, setKirim] = useState(false);
  if (hasil?.ok) return <p className="text-sm font-semibold text-cocoa">✓ {hasil.pesan}</p>;
  if (!buka)
    return (
      <button type="button" onClick={() => setBuka(true)} className="self-start py-2 text-sm font-semibold text-cocoa underline">
        Laporkan soal ini
      </button>
    );
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setKirim(true);
        try {
          setHasil(await reportQuestion(attemptId, questionId, isi));
        } catch {
          setHasil({ ok: false, pesan: "Gagal mengirim. Cek koneksi lalu coba lagi." });
        } finally {
          setKirim(false);
        }
      }}
    >
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Apa yang salah dari soal ini?
        <textarea
          value={isi}
          onChange={(e) => setIsi(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Contoh: kuncinya seharusnya C karena…"
          className="rounded-xl border-2 border-beige p-3 font-normal outline-none focus:border-cocoa"
        />
      </label>
      {hasil && !hasil.ok && <p className="text-sm font-semibold text-danger">✕ {hasil.pesan}</p>}
      <div className="flex gap-2">
        <button disabled={kirim} className="rounded-xl bg-cocoa px-4 py-2.5 text-sm font-bold text-cream disabled:opacity-60">
          {kirim ? "Mengirim…" : "Kirim laporan"}
        </button>
        <button type="button" onClick={() => setBuka(false)} className="rounded-xl border-2 border-beige px-4 py-2 text-sm font-bold">
          Batal
        </button>
      </div>
    </form>
  );
}

function Kartu({ item, attemptId }: { item: ItemPembahasan; attemptId: string }) {
  const tkp = item.subtes === "TKP";
  const badge =
    item.status === "benar"
      ? { t: "Benar · 5 poin", c: "text-cocoa", i: "✓" }
      : item.status === "salah"
        ? { t: "Jawabanmu salah · 0 poin", c: "text-danger", i: "✕" }
        : item.status === "kosong"
          ? { t: "Tidak dijawab · 0 poin", c: "text-muted", i: "–" }
          : { t: `Kamu dapat ${item.poin} dari 5 poin`, c: "text-cocoa", i: "" };
  return (
    <article id={`soal-${item.nomor}`} className="flex flex-col gap-4 rounded-2xl border border-beige bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-extrabold text-cocoa sm:text-lg">
          Soal {item.nomor} · {item.subtes}
          {item.kategori ? ` · ${item.kategori}` : ""}
        </h2>
        <span className={`flex items-center gap-1.5 text-sm font-bold ${badge.c}`}>
          {badge.i && <span aria-hidden>{badge.i}</span>}
          {badge.t}
          {item.ragu && <span className="rounded-full bg-caramel px-2 py-0.5 text-xs text-charcoal">ragu</span>}
        </span>
      </div>
      <p className="whitespace-pre-line leading-relaxed sm:text-lg">{item.soal}</p>
      {item.gambar && <Gambar src={item.gambar} alt={`Gambar soal ${item.nomor}`} besar />}
      <div className="flex flex-col gap-2">
        {item.opsi.map((o) => {
          const dipilih = item.pilih === o.label;
          const kunci = tkp ? o.bobot === 5 : o.benar;
          const salahPilih = dipilih && !tkp && !o.benar;
          const box = kunci
            ? "border-2 border-cocoa bg-beige"
            : salahPilih
              ? "border-2 border-dashed border-danger bg-white"
              : dipilih
                ? "border-2 border-dashed border-mocha bg-white"
                : "border-2 border-beige bg-white";
          const bulat = kunci ? "bg-cocoa text-cream" : salahPilih ? "bg-danger text-white" : dipilih ? "bg-mocha text-white" : "bg-cream text-cocoa";
          return (
            <div key={o.label} className={`flex items-center gap-3 rounded-xl p-2.5 sm:p-3 ${box}`}>
              <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-full font-extrabold ${bulat}`}>{o.label}</span>
              <span className="flex flex-1 flex-col items-start gap-1.5">
                {o.teks && <span className={kunci ? "font-semibold" : ""}>{o.teks}</span>}
                {o.gambar && <Gambar src={o.gambar} alt={`Gambar opsi ${o.label}`} />}
                <span className="flex flex-wrap gap-2 text-xs font-bold">
                  {dipilih && <span className={salahPilih ? "text-danger" : "text-cocoa"}>Jawabanmu</span>}
                  {kunci && !tkp && <span className="text-cocoa">Kunci</span>}
                </span>
              </span>
              {tkp && <span className="flex-none font-extrabold text-muted">{o.bobot} poin</span>}
            </div>
          );
        })}
      </div>
      <div className="flex flex-col gap-2 rounded-2xl bg-cream p-4 sm:p-5">
        <h3 className="font-extrabold text-cocoa">Pembahasan</h3>
        <p className="whitespace-pre-line leading-relaxed">{item.pembahasan}</p>
      </div>
      <Laporkan attemptId={attemptId} questionId={item.id} />
    </article>
  );
}

export function PembahasanList({ attemptId, items }: { attemptId: string; items: ItemPembahasan[] }) {
  const [filter, setFilter] = useState<Filter>("semua");
  const [hal, setHal] = useState(0);
  const jumlah = useMemo(
    () => ({
      semua: items.length,
      salah: items.filter((i) => i.status === "salah").length,
      kosong: items.filter((i) => i.status === "kosong").length,
      ragu: items.filter((i) => i.ragu).length,
    }),
    [items],
  );
  const tampil = items.filter((i) =>
    filter === "semua"
      ? true
      : filter === "salah"
        ? i.status === "salah"
        : filter === "kosong"
          ? i.status === "kosong"
          : filter === "ragu"
            ? i.ragu
            : i.subtes === filter,
  );
  const totalHal = Math.max(1, Math.ceil(tampil.length / PER_HALAMAN));
  const h = Math.min(hal, totalHal - 1);
  const potong = tampil.slice(h * PER_HALAMAN, (h + 1) * PER_HALAMAN);
  const pilihan: [Filter, string][] = [
    ["semua", `Semua · ${jumlah.semua}`],
    ["salah", `Salah · ${jumlah.salah}`],
    ["kosong", `Kosong · ${jumlah.kosong}`],
    ["ragu", `Ragu · ${jumlah.ragu}`],
    ["TWK", "TWK"],
    ["TIU", "TIU"],
    ["TKP", "TKP"],
  ];
  const pindah = (n: number) => {
    setHal(n);
    window.scrollTo({ top: 0 });
  };

  return (
    <>
      <div role="group" aria-label="Filter soal" className="flex flex-wrap gap-2">
        {pilihan.map(([f, label]) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => {
              setFilter(f);
              setHal(0);
            }}
            className={`rounded-full border-2 px-4 py-2 text-sm font-bold ${filter === f ? "border-cocoa bg-cocoa text-cream" : "border-beige bg-white text-cocoa"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {potong.length === 0 && <p className="text-muted">Tidak ada soal di kategori ini.</p>}
      {potong.map((item) => (
        <Kartu key={item.id} item={item} attemptId={attemptId} />
      ))}
      {totalHal > 1 && (
        <nav aria-label="Halaman pembahasan" className="flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={h === 0}
            onClick={() => pindah(h - 1)}
            className="rounded-xl border-2 border-cocoa bg-white px-4 py-3 font-bold text-cocoa disabled:opacity-40"
          >
            ‹ Sebelumnya
          </button>
          <span className="text-sm font-semibold text-muted">
            Halaman {h + 1} dari {totalHal}
          </span>
          <button
            type="button"
            disabled={h >= totalHal - 1}
            onClick={() => pindah(h + 1)}
            className="rounded-xl bg-cocoa px-4 py-3 font-bold text-cream disabled:opacity-40"
          >
            Berikutnya ›
          </button>
        </nav>
      )}
    </>
  );
}
