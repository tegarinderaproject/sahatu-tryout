import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { getSemuaAkses, masihAktif } from "@/lib/access";
import { requireActiveUser } from "@/lib/auth";
import { getRanking, posisiPeserta } from "@/lib/ranking";
import { createAdminClient } from "@/lib/supabase/admin";
import { TabelRanking } from "./TabelRanking";

async function Isi({ searchParams }: { searchParams: PageProps<"/ranking">["searchParams"] }) {
  await connection();
  const user = await requireActiveUser("/ranking");
  const sp = await searchParams;
  const { data: parts } = await createAdminClient()
    .from("parts")
    .select("id, kode, nama")
    .eq("status", "terbit")
    .order("kode");
  const akses = await getSemuaAkses(user.id);
  const dimiliki = (id: string) => user.role === "admin" || masihAktif(akses.get(id));
  const pilihan = (parts ?? []).find((p) => p.kode === sp.part) ?? (parts ?? []).find((p) => dimiliki(p.id));

  const tabs = (
    <div role="tablist" aria-label="Pilih Part" className="flex flex-wrap gap-2">
      {(parts ?? []).map((p) =>
        dimiliki(p.id) ? (
          <Link
            key={p.id}
            role="tab"
            aria-selected={p.id === pilihan?.id}
            href={`/ranking?part=${p.kode}`}
            className={`rounded-full border-2 px-4 py-2 text-sm font-bold ${p.id === pilihan?.id ? "border-cocoa bg-cocoa text-cream" : "border-beige bg-white text-cocoa"}`}
          >
            {p.nama}
          </Link>
        ) : (
          <Link
            key={p.id}
            href={`/katalog?perlu=${p.kode}`}
            aria-label={`${p.nama} terkunci, beli untuk melihat ranking`}
            className="flex items-center gap-1.5 rounded-full border-2 border-dashed border-mocha bg-cream px-4 py-2 text-sm font-bold text-muted"
          >
            <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            {p.nama} · beli untuk lihat
          </Link>
        ),
      )}
    </div>
  );

  // Data ranking hanya diambil kalau peserta punya akses aktif (dicek di server).
  if (!pilihan || !dimiliki(pilihan.id)) {
    return (
      <>
        <h1 className="text-3xl font-extrabold text-cocoa sm:text-4xl">Ranking Peserta</h1>
        {tabs}
        <p className="rounded-2xl border border-beige bg-white p-5">
          Ranking hanya tampil untuk Part yang sudah kamu miliki.{" "}
          <Link href="/katalog" className="font-bold text-cocoa underline">
            Lihat katalog
          </Link>
        </p>
      </>
    );
  }

  const ranking = await getRanking(pilihan.id);
  const posisi = posisiPeserta(ranking, user.id);
  const rata = ranking.length ? Math.round(ranking.reduce((a, r) => a + r.total, 0) / ranking.length) : 0;
  const [r1, r2, r3] = ranking;
  const podium = (r: (typeof ranking)[number] | undefined, utama = false) =>
    r ? (
      <div
        className={`flex flex-col items-center gap-1.5 rounded-2xl p-5 text-center ${utama ? "order-first bg-cocoa py-7 text-cream sm:order-none" : "border border-beige bg-white"}`}
      >
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-full text-lg font-extrabold ${utama ? "bg-caramel text-charcoal" : "bg-beige text-cocoa"}`}
        >
          {r.rank}
        </span>
        <strong className="text-lg">{r.nama}</strong>
        <span className={`text-3xl font-extrabold ${utama ? "" : "text-cocoa"}`}>{r.total}</span>
        <span className={`text-xs ${utama ? "text-beige" : "text-muted"}`}>
          TWK {r.twk} · TIU {r.tiu} · TKP {r.tkp}
        </span>
      </div>
    ) : null;

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold text-cocoa sm:text-4xl">Ranking Peserta</h1>
        <p className="text-muted">
          {ranking.length.toLocaleString("id-ID")} peserta{ranking.length ? ` · rata-rata total ${rata}` : ""} ·
          diperbarui setiap ada peserta selesai
        </p>
      </div>
      {tabs}

      {ranking.length === 0 ? (
        <p className="rounded-2xl border border-beige bg-white p-5">Belum ada peserta yang menyelesaikan {pilihan.nama}.</p>
      ) : (
        <>
          <section aria-label="Tiga besar" className="grid items-end gap-4 sm:grid-cols-3">
            {podium(r2)}
            {podium(r1, true)}
            {podium(r3)}
          </section>

          <section aria-labelledby="posisi" className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-beige p-5">
            <div className="flex flex-col gap-0.5">
              <h2 id="posisi" className="font-bold text-cocoa">
                Posisimu
              </h2>
              {posisi ? (
                <span className="text-3xl font-extrabold">
                  #{posisi.rank}{" "}
                  <span className="text-base font-semibold text-muted">
                    dari {posisi.dari.toLocaleString("id-ID")} · top {posisi.persenTeratas}%
                  </span>
                </span>
              ) : (
                <span className="font-semibold">Kerjakan {pilihan.nama} untuk masuk ranking.</span>
              )}
            </div>
            {posisi && (
              <>
                <div className="flex flex-wrap gap-4 font-semibold">
                  <span>TWK {posisi.baris.twk}</span>
                  <span>TIU {posisi.baris.tiu}</span>
                  <span>TKP {posisi.baris.tkp}</span>
                  <span className="font-extrabold">Total {posisi.baris.total}</span>
                </div>
                <span className="text-sm font-semibold text-cocoa">
                  {posisi.kurangKeTop100 === null
                    ? "Kamu sudah masuk top 100 🎉"
                    : `Masuk top 100 butuh sekitar ${posisi.kurangKeTop100} poin lagi`}
                </span>
              </>
            )}
          </section>

          <TabelRanking
            partNama={pilihan.nama}
            rows={ranking.slice(0, 50).map((r) => ({
              rank: r.rank,
              nama: r.nama,
              twk: r.twk,
              tiu: r.tiu,
              tkp: r.tkp,
              total: r.total,
              lulus: r.lulus,
              saya: r.userId === user.id,
            }))}
          />
        </>
      )}

      <section aria-labelledby="aturan" className="flex flex-col gap-2 leading-relaxed">
        <h2 id="aturan" className="font-extrabold text-cocoa">
          Cara ranking dihitung
        </h2>
        <ul className="list-disc pl-5">
          <li>
            Hanya dari <strong>percobaan pertama</strong> tiap peserta, supaya yang mengulang tidak otomatis naik.
          </li>
          <li>Diurutkan dari total nilai. Kalau total sama, dibandingkan TKP, lalu TIU, lalu TWK.</li>
          <li>Nama ditampilkan sebagian untuk menjaga privasi.</li>
        </ul>
      </section>
    </>
  );
}

export default function RankingPage(props: PageProps<"/ranking">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
        <Suspense fallback={<p className="text-muted">Memuat ranking…</p>}>
          <Isi searchParams={props.searchParams} />
        </Suspense>
      </main>
    </>
  );
}
