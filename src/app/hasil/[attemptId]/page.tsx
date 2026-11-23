import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { requireActiveUser } from "@/lib/auth";
import type { SubtesResult } from "@/lib/exam/types";
import { createAdminClient } from "@/lib/supabase/admin";

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

function Summary({ result }: { result: Hasil }) {
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

type Hasil = {
  total: number;
  maks: number;
  lulus: boolean;
  subtes: SubtesResult[];
};

async function ResultView({ params }: { params: PageProps<"/hasil/[attemptId]">["params"] }) {
  await connection(); // data login selalu dibaca saat diminta
  const { attemptId } = await params;
  const user = await requireActiveUser(`/hasil/${attemptId}`);
  const { data: a } = await createAdminClient()
    .from("attempts")
    .select("id, user_id, selesai, total, lulus, waktu_habis, rincian, percobaan_ke, parts(nama, kode)")
    .eq("id", attemptId)
    .maybeSingle();
  if (!a || a.user_id !== user.id) notFound();
  if (!a.selesai) redirect(`/ujian/${a.id}`);
  const part = a.parts as unknown as { nama: string; kode: string };
  const subtes = (a.rincian ?? []) as SubtesResult[];
  const result: Hasil = {
    total: a.total ?? 0,
    maks: subtes.reduce((x, r) => x + r.maks, 0),
    lulus: !!a.lulus,
    subtes,
  };
  const waktu = new Date(a.selesai).toLocaleString("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  });
  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-bold tracking-wide text-muted">
          TRYOUT SKD · {part.nama.toUpperCase()} · PERCOBAAN KE-{a.percobaan_ke}
        </span>
        <h1 className="text-3xl font-extrabold text-cocoa sm:text-4xl">Hasil Tryout</h1>
      </div>
      <p className="-mt-4 text-sm text-muted">
        Dikumpulkan {waktu} WIB{a.waktu_habis ? " (otomatis, waktu habis)" : ""}.
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
          href={`/tryout/${part.kode}`}
          className="rounded-xl bg-cocoa px-6 py-4 text-center font-bold text-cream hover:bg-charcoal"
        >
          Ulangi tryout
        </Link>
        <Link href="/dashboard" className="rounded-xl border-2 border-cocoa px-6 py-4 text-center font-bold text-cocoa">
          Ke dashboard
        </Link>
      </div>
    </>
  );
}

export default function HasilPage(props: PageProps<"/hasil/[attemptId]">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-7 px-4 py-8 sm:px-6 sm:py-10">
        <Suspense fallback={<p className="text-muted">Memuat hasil…</p>}>
          <ResultView params={props.params} />
        </Suspense>
      </main>
    </>
  );
}
