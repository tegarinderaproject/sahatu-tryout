"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { Label, PublicQuestion, Subtes } from "@/lib/exam/types";
import { submitExam } from "../actions";

type Props = {
  partId: string;
  partNama: string;
  attemptId: string;
  questions: PublicQuestion[];
  /** Batas waktu (ms epoch) yang dihitung server. */
  deadline: number;
  /** Jam server saat halaman dibuat, untuk mengoreksi jam HP yang salah. */
  serverNow: number;
};

type Saved = { answers: Record<number, Label>; ragu: Record<number, boolean>; cur: number };

const storageKey = (attemptId: string) => `sahatu:ujian:${attemptId}`;

function loadSaved(attemptId: string): Saved {
  try {
    const raw = localStorage.getItem(storageKey(attemptId));
    if (raw) return JSON.parse(raw) as Saved;
  } catch {
    /* localStorage tidak tersedia: mulai kosong */
  }
  return { answers: {}, ragu: {}, cur: 0 };
}

function formatTime(ms: number) {
  const t = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const p = (x: number) => String(x).padStart(2, "0");
  return `${h}:${p(m)}:${p(s)}`;
}

export function ExamClient({ partId, partNama, attemptId, questions, deadline, serverNow }: Props) {
  const [state, setState] = useState<Saved | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [zoom, setZoom] = useState<{ src: string; alt: string } | null>(null);
  const [submitting, startSubmit] = useTransition();
  const submittedRef = useRef(false);
  const offsetRef = useRef(0);

  // Muat jawaban tersimpan + hitung selisih jam HP vs server (sekali, setelah halaman tampil).
  useEffect(() => {
    offsetRef.current = serverNow - Date.now();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- baca localStorage hanya bisa di browser
    setState(loadSaved(attemptId));
  }, [attemptId, serverNow]);

  // Autosave ke perangkat setiap ada perubahan.
  useEffect(() => {
    if (!state) return;
    try {
      localStorage.setItem(storageKey(attemptId), JSON.stringify(state));
    } catch {
      /* penuh / diblokir: abaikan */
    }
  }, [attemptId, state]);

  const submit = useCallback(() => {
    if (submittedRef.current || !state) return;
    submittedRef.current = true;
    const payload: Record<string, string> = {};
    for (const [k, v] of Object.entries(state.answers)) payload[k] = v;
    startSubmit(async () => {
      try {
        await submitExam(partId, attemptId, payload);
      } finally {
        submittedRef.current = false;
      }
    });
  }, [attemptId, partId, state]);

  // Timer: dihitung dari batas waktu server, bukan dari jam HP.
  useEffect(() => {
    if (!state) return;
    const tick = () => {
      const left = deadline - (Date.now() + offsetRef.current);
      setRemaining(left);
      if (left <= 0) submit();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline, state, submit]);

  const groups = useMemo(() => {
    const out: { subtes: Subtes; from: number; to: number; idx: number[] }[] = [];
    questions.forEach((q, i) => {
      const last = out[out.length - 1];
      if (last && last.subtes === q.subtes) {
        last.idx.push(i);
        last.to = q.nomor;
      } else out.push({ subtes: q.subtes, from: q.nomor, to: q.nomor, idx: [i] });
    });
    return out;
  }, [questions]);

  if (!state) {
    return <p className="flex flex-1 items-center justify-center p-10 text-muted">Memuat jawaban tersimpan…</p>;
  }

  const total = questions.length;
  const cur = Math.min(Math.max(state.cur, 0), total - 1);
  const q = questions[cur];
  const chosen = state.answers[q.nomor];
  const isRagu = !!state.ragu[q.nomor];
  const answeredCount = Object.keys(state.answers).length;
  const raguCount = Object.values(state.ragu).filter(Boolean).length;
  const lowTime = remaining !== null && remaining < 5 * 60_000;

  const go = (i: number) => {
    setState({ ...state, cur: Math.min(Math.max(i, 0), total - 1) });
    setPanelOpen(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };
  const pick = (label: Label) => setState({ ...state, answers: { ...state.answers, [q.nomor]: label } });
  const clearAnswer = () => {
    const answers = { ...state.answers };
    delete answers[q.nomor];
    setState({ ...state, answers });
  };
  const toggleRagu = () => setState({ ...state, ragu: { ...state.ragu, [q.nomor]: !isRagu } });

  const navPanel = (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-extrabold text-cocoa">Nomor soal</h2>
        <span className="text-sm font-semibold text-muted">
          {answeredCount}/{total} terjawab
        </span>
      </div>
      {groups.map((g) => (
        <div key={g.subtes} className="flex flex-col gap-2">
          <span className="text-xs font-bold text-muted">
            {g.subtes} · {g.from}–{g.to}
          </span>
          <div className="grid grid-cols-8 gap-1.5">
            {g.idx.map((i) => {
              const n = questions[i].nomor;
              const ragu = !!state.ragu[n];
              const ans = !!state.answers[n];
              const isCur = i === cur;
              const tone = ragu
                ? "bg-caramel text-charcoal border-caramel"
                : ans
                  ? "bg-cocoa text-cream border-cocoa"
                  : "bg-white text-charcoal border-mocha";
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Soal ${n}, ${ragu ? "ragu-ragu" : ans ? "terjawab" : "belum dijawab"}`}
                  aria-current={isCur ? "true" : undefined}
                  className={`h-9 rounded-lg border-[1.5px] text-xs font-bold ${tone} ${isCur ? "ring-2 ring-charcoal ring-offset-1" : ""}`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-3 border-t border-beige pt-3 text-xs font-semibold">
        <span className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded bg-cocoa" />
          Terjawab
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded bg-caramel" />
          Ragu-ragu
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded border-[1.5px] border-mocha bg-white" />
          Belum
        </span>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {/* Header: timer selalu terlihat */}
      <header className="sticky top-0 z-20 bg-cocoa text-cream">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Image
              src="/brand/logo-terang.png"
              alt="SAHATU Academy"
              width={640}
              height={216}
              className="hidden h-9 w-auto sm:block"
              priority
            />
            <span className="truncate text-sm font-semibold sm:text-base">{partNama}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div
              role="timer"
              aria-label="Sisa waktu"
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-lg font-extrabold tabular-nums ${lowTime ? "bg-danger text-white" : "bg-cream text-charcoal"}`}
            >
              <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <circle cx="12" cy="13" r="8" />
                <path d="M12 9v4l2.5 2M9 2h6" />
              </svg>
              {remaining === null ? "–:––:––" : formatTime(remaining)}
            </div>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={submitting}
              className="rounded-xl bg-caramel px-3 py-2.5 text-sm font-bold text-charcoal hover:bg-beige sm:px-5 sm:text-base"
            >
              Selesai<span className="hidden sm:inline"> Ujian</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 items-start gap-6 px-3 py-4 sm:px-6 sm:py-6">
        <main className="flex min-w-0 flex-1 flex-col gap-5 rounded-2xl border border-beige bg-white p-4 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-lg font-extrabold text-cocoa sm:text-xl">Soal nomor {q.nomor}</h1>
            <span className="rounded-full bg-beige px-3 py-1 text-sm font-bold text-cocoa">{q.subtes}</span>
          </div>

          <p className="whitespace-pre-line text-base leading-relaxed sm:text-lg">{q.soal}</p>

          {q.gambar && (
            <ZoomableImage src={q.gambar} alt={`Gambar soal nomor ${q.nomor}`} onZoom={setZoom} large />
          )}

          <div role="radiogroup" aria-label="Pilihan jawaban" className="flex flex-col gap-2.5">
            {q.opsi.map((o) => {
              const on = chosen === o.label;
              return (
                <div
                  key={o.label}
                  className={`flex items-center gap-3 rounded-2xl border-2 p-2.5 sm:p-3 ${on ? "border-cocoa bg-beige" : "border-beige bg-white"}`}
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => pick(o.label)}
                    className="flex min-h-11 flex-1 items-center gap-3 text-left"
                  >
                    <span
                      className={`flex h-9 w-9 flex-none items-center justify-center rounded-full font-extrabold ${on ? "bg-cocoa text-cream" : "bg-cream text-cocoa"}`}
                    >
                      {o.label}
                    </span>
                    <span className="flex flex-1 flex-col items-start gap-2">
                      {o.teks && <span className="leading-snug">{o.teks}</span>}
                      {o.gambar && (
                        // Gambar opsi rata kiri, tepat di sebelah huruf. Ketuk gambar = pilih jawaban.
                        // eslint-disable-next-line @next/next/no-img-element -- ukuran gambar soal bervariasi
                        <img
                          src={o.gambar}
                          alt={`Gambar opsi ${o.label}`}
                          className="h-24 w-auto max-w-full rounded-lg border border-beige bg-white sm:h-28"
                        />
                      )}
                    </span>
                  </button>
                  {o.gambar && (
                    <button
                      type="button"
                      onClick={() => setZoom({ src: o.gambar!, alt: `Gambar opsi ${o.label}` })}
                      aria-label={`Perbesar gambar opsi ${o.label}`}
                      className="flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-beige bg-cream text-cocoa"
                    >
                      <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                        <circle cx="11" cy="11" r="7" />
                        <path d="m20 20-3.5-3.5M11 8v6M8 11h6" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {chosen && (
            <button type="button" onClick={clearAnswer} className="self-start text-sm font-semibold text-muted underline">
              Hapus jawaban nomor ini
            </button>
          )}

          <div className="grid grid-cols-3 gap-2 border-t border-beige pt-4">
            <button
              type="button"
              onClick={() => go(cur - 1)}
              disabled={cur === 0}
              className="rounded-xl border-2 border-cocoa bg-white px-2 py-3 text-sm font-bold text-cocoa disabled:opacity-40 sm:text-base"
            >
              ‹ Sebelumnya
            </button>
            <button
              type="button"
              onClick={toggleRagu}
              aria-pressed={isRagu}
              className={`rounded-xl border-2 border-caramel px-2 py-3 text-sm font-bold text-charcoal sm:text-base ${isRagu ? "bg-caramel" : "bg-cream"}`}
            >
              {isRagu ? "Batal ragu" : "Ragu-ragu"}
            </button>
            <button
              type="button"
              onClick={() => go(cur + 1)}
              disabled={cur === total - 1}
              className="rounded-xl border-2 border-cocoa bg-cocoa px-2 py-3 text-sm font-bold text-cream disabled:opacity-40 sm:text-base"
            >
              Berikutnya ›
            </button>
          </div>
          <p className="text-center text-xs text-muted">Jawaban tersimpan otomatis di perangkat ini.</p>
        </main>

        {/* Panel nomor soal: samping di layar lebar */}
        <aside
          aria-label="Navigasi nomor soal"
          className="hidden w-80 flex-none rounded-2xl border border-beige bg-white p-5 lg:block"
        >
          {navPanel}
        </aside>
      </div>

      {/* Tombol panel nomor soal di HP */}
      <button
        type="button"
        onClick={() => setPanelOpen(true)}
        className="sticky bottom-0 z-10 border-t border-beige bg-white px-4 py-3 text-center font-bold text-cocoa lg:hidden"
      >
        Daftar soal · {answeredCount}/{total} terjawab{raguCount ? ` · ${raguCount} ragu` : ""}
      </button>

      {panelOpen && (
        <div className="fixed inset-0 z-30 flex items-end bg-charcoal/55 lg:hidden" onClick={() => setPanelOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Daftar nomor soal"
            className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {navPanel}
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="mt-4 w-full rounded-xl border-2 border-cocoa py-3 font-bold text-cocoa"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-charcoal/55 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="konfirmasi-judul"
            className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-white p-6"
          >
            <h2 id="konfirmasi-judul" className="text-xl font-extrabold text-cocoa">
              Selesaikan ujian?
            </h2>
            <p className="leading-relaxed">
              Masih ada <strong>{total - answeredCount} soal belum dijawab</strong> dan{" "}
              <strong>{raguCount} soal ragu-ragu</strong>. Setelah selesai, jawaban tidak bisa diubah.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={submitting}
                className="rounded-xl border-2 border-cocoa px-4 py-3 font-bold text-cocoa"
              >
                Kembali ke soal
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="rounded-xl bg-cocoa px-5 py-3 font-bold text-cream disabled:opacity-60"
              >
                {submitting ? "Menilai…" : "Ya, selesai"}
              </button>
            </div>
          </div>
        </div>
      )}

      {submitting && !confirmOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-charcoal/55 p-4">
          <p className="rounded-2xl bg-white px-6 py-5 font-bold text-cocoa">Waktu habis. Mengumpulkan jawaban…</p>
        </div>
      )}

      {zoom && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Gambar diperbesar"
          className="fixed inset-0 z-50 flex flex-col bg-charcoal/90"
          onClick={() => setZoom(null)}
        >
          <div className="flex justify-end p-3">
            <button type="button" className="rounded-xl bg-white px-4 py-2 font-bold text-cocoa">
              Tutup ✕
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center overflow-auto p-3" style={{ touchAction: "pinch-zoom" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- ukuran gambar soal bervariasi */}
            <img src={zoom.src} alt={zoom.alt} className="max-h-full w-full max-w-3xl rounded-lg bg-white object-contain" />
          </div>
          <p className="p-3 text-center text-sm text-cream">Cubit layar untuk memperbesar lagi. Ketuk untuk menutup.</p>
        </div>
      )}
    </div>
  );
}

function ZoomableImage({
  src,
  alt,
  onZoom,
  large,
}: {
  src: string;
  alt: string;
  onZoom: (z: { src: string; alt: string }) => void;
  large?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onZoom({ src, alt })}
      aria-label={`${alt}, ketuk untuk memperbesar`}
      className={`relative flex-none overflow-hidden rounded-lg border border-beige bg-white ${large ? "self-center" : ""}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- ukuran gambar soal bervariasi */}
      <img src={src} alt={alt} className={large ? "max-h-72 w-auto max-w-full" : "h-20 w-auto sm:h-24"} />
      <span aria-hidden className="absolute bottom-1 right-1 rounded bg-charcoal/70 px-1.5 text-xs text-cream">
        ⤢
      </span>
    </button>
  );
}
