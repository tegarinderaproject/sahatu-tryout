import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { getPart } from "@/lib/exam/questions";
import { readResult } from "@/lib/exam/session";
import type { ExamResult, SubtesResult } from "@/lib/exam/types";

export function generateStaticParams() {
  return [{ part: "p0" }];
}

const CheckIcon = () => (
  <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const CrossIcon = () => (
  <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

function SubtesCard({ r }: { r: SubtesResult }) {
  const pct = (x: number) => `${Math.min(100, (x / r.maks) * 100).toFixed(1)}%`;
  const stats =
    r.subtes === "TKP"
      ? [
          [r.benar, "Dijawab"],
          [r.kosong, "Kosong"],
          [r.benar ? (r.nilai / r.benar).toFixed(1).replace(".", ",") : "0", "Rata² poin"],
        ]
      : [
          [r.benar, "Benar"],
          [r.salah, "Salah"],
          [r.kosong, "Kosong"],
        ];
  return (
    <article
      className={`flex flex-col gap-3 rounded-2xl bg-white p-5 ${r.lulus ? "border border-beige" : "border-2 border-danger"}`}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-cocoa">{r.subtes}</h2>
        <span className={`flex items-center gap-1.5 text-sm font-bold ${r.lulus ? "text-cocoa" : "text-danger"}`}>
          {r.lulus ? <CheckIcon /> : <CrossIcon />}
          {r.lulus ? "Lulus" : "Belum lulus"}
        </span>
      </div>
      <span className="text-4xl font-extrabold">
        {r.nilai}{" "}
        <span className="text-base font-semibold text-muted">
          / {r.maks} · min. {r.passingGrade}
        </span>
      </span>
      <div className="relative h-3 rounded-full bg-cream" aria-hidden>
        <div className={`h-full rounded-full ${r.lulus ? "bg-cocoa" : "bg-caramel"}`} style={{ width: pct(r.nilai) }} />
        <div className="absolute -top-1 h-5 w-[3px] rounded bg-charcoal" style={{ left: pct(r.passingGrade) }} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        {stats.map(([v, l]) => (
          <span key={l} className="rounded-lg bg-cream p-2">
            <strong className="block text-lg">{v}</strong>
            {l}
          </span>
        ))}
      </div>
    </article>
  );
}

function Summary({ result }: { result: ExamResult }) {
  const kurang = result.subtes.filter((r) => !r.lulus);
  return (
    <section
      aria-label="Ringkasan nilai"
      className="flex flex-wrap items-center justify-between gap-6 rounded-3xl bg-cocoa p-6 text-cream sm:p-8"
    >
      <div className="flex flex-col gap-1">
        <span className="font-semibold text-beige">Total nilai</span>
        <span className="text-6xl font-extrabold leading-none">
          {result.total} <span className="text-xl font-semibold text-beige">/ {result.maks}</span>
        </span>
      </div>
      <div className="flex flex-[1_1_320px] flex-col gap-2 rounded-2xl bg-cream p-5 text-charcoal">
        {result.lulus ? (
          <>
            <span className="flex items-center gap-2 text-xl font-extrabold text-cocoa">
              <CheckIcon />
              Memenuhi passing grade
            </span>
            <p className="leading-relaxed">Ketiga subtes sudah di atas batas minimal. Pertahankan!</p>
          </>
        ) : (
          <>
            <span className="flex items-center gap-2 text-xl font-extrabold text-danger">
              <CrossIcon />
              Belum memenuhi passing grade
            </span>
            <p className="leading-relaxed">
              {kurang.map((r, i) => (
                <span key={r.subtes}>
                  {i > 0 && (i === kurang.length - 1 ? " dan " : ", ")}
                  {r.subtes} kurang <strong>{r.passingGrade - r.nilai} poin</strong>
                </span>
              ))}
              .
            </p>
          </>
        )}
      </div>
    </section>
  );
}

async function ResultView({ partId }: { partId: string }) {
  const result = await readResult(partId);
  if (!result) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p>Belum ada hasil tryout untuk part ini.</p>
        <Link href={`/tryout/${partId}`} className="rounded-xl bg-cocoa px-5 py-3 font-bold text-cream">
          Mulai tryout
        </Link>
      </div>
    );
  }
  const waktu = new Date(result.selesaiPada).toLocaleString("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  });
  return (
    <>
      <p className="-mt-4 text-sm text-muted">
        Dikumpulkan {waktu} WIB{result.waktuHabis ? " (otomatis, waktu habis)" : ""}.
      </p>
      <Summary result={result} />
      <section aria-label="Nilai per subtes" className="grid gap-4 md:grid-cols-3">
        {result.subtes.map((r) => (
          <SubtesCard key={r.subtes} r={r} />
        ))}
      </section>
      <p className="-mt-3 text-xs text-muted">Garis tegak di setiap bar = batas passing grade.</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/tryout/${partId}`}
          className="rounded-xl bg-cocoa px-6 py-4 text-center font-bold text-cream hover:bg-charcoal"
        >
          Ulangi tryout
        </Link>
        <span className="rounded-xl border-2 border-beige px-6 py-4 text-center font-bold text-muted">
          Pembahasan menyusul (Tahap 4)
        </span>
      </div>
    </>
  );
}

export default async function HasilPage({ params }: PageProps<"/tryout/[part]/hasil">) {
  const { part: partId } = await params;
  const part = getPart(partId);
  if (!part) notFound();
  return (
    <>
      <SiteHeader>
        <Link href="/" className="font-semibold text-cocoa">
          Beranda
        </Link>
      </SiteHeader>
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-7 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-bold tracking-wide text-muted">TRYOUT SKD · {part.nama.toUpperCase()}</span>
          <h1 className="text-3xl font-extrabold text-cocoa sm:text-4xl">Hasil Tryout</h1>
        </div>
        <Suspense fallback={<p className="text-muted">Memuat hasil…</p>}>
          <ResultView partId={part.id} />
        </Suspense>
      </main>
    </>
  );
}
