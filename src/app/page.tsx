import { connection } from "next/server";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { createAdminClient } from "@/lib/supabase/admin";

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

const ikon = {
  layar: <path d="M3 4h18v13H3zM8 21h8M12 17v4" />,
  grafik: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  lampu: <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />,
  piala: <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />,
};

const keunggulan: [keyof typeof ikon, string, string][] = [
  ["layar", "Tampilan mirip CAT BKN", "Timer 100 menit, panel nomor soal, dan tanda ragu-ragu. Biar nggak kaget di hari H."],
  ["grafik", "Nilai sesuai aturan SKD", "TWK dan TIU benar 5, TKP berbobot 1–5 per opsi, lalu dicek langsung terhadap passing grade."],
  ["lampu", "Pembahasan tiap soal", "Dijelaskan langkah demi langkah, termasuk trik cepat TIU."],
  ["piala", "Ranking antarpeserta", "Lihat posisimu dibanding peserta lain. Dihitung dari percobaan pertama supaya adil."],
];

const langkah: [string, string][] = [
  ["Daftar akun", "Pakai email, kurang dari semenit."],
  ["Pilih paket & bayar QRIS", "Scan pakai e-wallet atau m-banking, paket langsung terbuka."],
  ["Kerjakan tryout", "110 soal, 100 menit. Jawaban tersimpan otomatis."],
  ["Lihat nilai & pembahasan", "Ulangi sebanyak yang kamu mau selama masa akses."],
];

const faq: [string, string][] = [
  ["Bisa dikerjakan di HP?", "Bisa. Tampilan menyesuaikan layar HP, dan jawaban tersimpan otomatis kalau koneksi putus."],
  ["Berapa lama aksesnya?", "1 tahun sejak tanggal pembelian, dan boleh dikerjakan ulang berkali-kali selama masa itu."],
  ["Bayarnya pakai apa?", "QRIS. Bisa dibayar dari GoPay, OVO, DANA, ShopeePay, atau aplikasi m-banking."],
  ["Bisa login di dua HP sekaligus?", "Tidak. Satu akun hanya aktif di satu perangkat. Login di HP baru otomatis mengeluarkan HP lama."],
  ["Kalau ada soal yang menurutku salah?", "Klik \"Laporkan soal\" di halaman pembahasan. Laporanmu kami cek dan soal diperbaiki."],
];

async function Harga() {
  await connection();
  const db = createAdminClient();
  const [{ data: parts }, { data: bundles }] = await Promise.all([
    db.from("parts").select("harga").eq("status", "terbit"),
    db.from("bundles").select("nama, harga, bundle_parts(parts(harga))").eq("status", "terbit").limit(1),
  ]);
  const satuan = Math.min(...(parts ?? []).map((p) => p.harga), 10000);
  const b = bundles?.[0];
  const isiB = (b?.bundle_parts ?? []).map((bp) => (bp.parts as unknown as { harga: number })?.harga ?? 0);
  const hemat = b ? isiB.reduce((a, x) => a + x, 0) - b.harga : 0;
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="flex flex-col gap-4 rounded-3xl bg-cream p-7">
        <span className="text-lg font-bold text-cocoa">Satuan</span>
        <span className="text-4xl font-extrabold">
          {rupiah(satuan)} <span className="text-base font-semibold text-muted">/ Part</span>
        </span>
        <ul className="list-disc pl-5 leading-loose">
          <li>1 tryout SKD (110 soal)</li>
          <li>Pembahasan lengkap</li>
          <li>Ranking peserta</li>
          <li>Ulang tanpa batas, 1 tahun</li>
        </ul>
        <Link href="/katalog" className="mt-auto rounded-2xl border-2 border-cocoa bg-white py-4 text-center font-bold text-cocoa">
          Pilih Part
        </Link>
      </div>
      {b ? (
        <div className="flex flex-col gap-4 rounded-3xl border-[3px] border-caramel bg-white p-7">
          <div className="flex items-center justify-between gap-3">
            <span className="text-lg font-bold text-cocoa">{b.nama}</span>
            {hemat > 0 && (
              <span className="rounded-full bg-caramel px-3 py-1 text-xs font-extrabold text-charcoal">HEMAT {rupiah(hemat)}</span>
            )}
          </div>
          <span className="text-4xl font-extrabold">{rupiah(b.harga)}</span>
          <ul className="list-disc pl-5 leading-loose">
            <li>{isiB.length} tryout SKD ({isiB.length * 110} soal)</li>
            <li>Pantau perkembangan nilai antar-TO</li>
            <li>Pembahasan dan ranking tiap Part</li>
            <li>Ulang tanpa batas, 1 tahun</li>
          </ul>
          <Link href="/katalog" className="mt-auto rounded-2xl bg-cocoa py-4 text-center font-bold text-cream">
            Ambil Bundling
          </Link>
        </div>
      ) : (
        <div className="flex flex-col justify-center gap-3 rounded-3xl border-2 border-dashed border-caramel p-7 text-cream">
          <span className="text-lg font-bold">Bundling 3 Part</span>
          <p className="text-beige">Lebih hemat. Dibuka setelah Part 3 rilis.</p>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-col">
        {/* Hero */}
        <section className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-10 px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex flex-[1_1_440px] flex-col gap-5">
            <span className="self-start rounded-full bg-beige px-3.5 py-2 text-xs font-bold tracking-wider text-cocoa">
              TRYOUT SKD CPNS · TWK · TIU · TKP
            </span>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-cocoa sm:text-5xl">
              Latihan seperti ujian aslinya, nilai langsung keluar.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed">
              Simulasi CAT 110 soal dalam 100 menit, lengkap dengan penilaian TKP 1–5, cek passing grade, pembahasan tiap
              soal, dan ranking antarpeserta.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/katalog" className="rounded-2xl bg-cocoa px-7 py-4 text-lg font-bold text-cream hover:bg-charcoal">
                Mulai dari Rp10.000
              </Link>
              <a href="#cara" className="rounded-2xl border-2 border-cocoa px-6 py-3.5 text-lg font-bold text-cocoa">
                Lihat cara kerjanya
              </a>
            </div>
            <p className="text-sm text-muted">Akses 1 tahun · Boleh diulang tanpa batas · Bayar QRIS</p>
          </div>
          <div className="flex flex-[1_1_380px] justify-center">
            <div aria-hidden className="flex w-full max-w-md flex-col gap-4 rounded-3xl border border-beige bg-white p-6 shadow-[0_24px_48px_rgba(91,64,50,0.14)]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cocoa">Hasil Tryout Part 1</span>
                <span className="rounded-full bg-cocoa px-3 py-1 text-xs font-bold text-cream">Contoh</span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  ["TWK", 85, 65],
                  ["TIU", 110, 80],
                  ["TKP", 172, 166],
                ].map(([s, n, pg]) => (
                  <div key={s} className="flex flex-col gap-1 rounded-2xl bg-cream p-3.5">
                    <span className="text-xs font-semibold text-muted">{s}</span>
                    <span className="text-2xl font-extrabold text-cocoa">{n}</span>
                    <span className="text-xs text-muted">min. {pg}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-beige px-4 py-3.5">
                <span className="font-bold">Total 367</span>
                <span className="font-extrabold text-cocoa">✓ Memenuhi passing grade</span>
              </div>
            </div>
          </div>
        </section>

        {/* Keunggulan */}
        <section id="keunggulan" className="border-y border-beige bg-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-14 sm:px-6">
            <div className="flex max-w-2xl flex-col gap-3">
              <h2 className="text-3xl font-extrabold tracking-tight text-cocoa sm:text-4xl">Bukan sekadar kumpulan soal</h2>
              <p className="text-lg leading-relaxed">
                Yang kamu latih bukan cuma menjawab, tapi juga mengatur waktu dan membaca kelemahanmu sendiri.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {keunggulan.map(([i, judul, isi]) => (
                <div key={judul} className="flex flex-col gap-3 rounded-2xl bg-cream p-6">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-cocoa">
                    <svg aria-hidden width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F7F2E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {ikon[i]}
                    </svg>
                  </span>
                  <h3 className="text-lg font-bold text-cocoa">{judul}</h3>
                  <p className="leading-relaxed">{isi}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cara kerja */}
        <section id="cara" className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-14 sm:px-6">
          <h2 className="text-3xl font-extrabold tracking-tight text-cocoa sm:text-4xl">Cara kerjanya</h2>
          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {langkah.map(([judul, isi], i) => (
              <li key={judul} className="flex flex-col gap-2.5">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-caramel text-lg font-extrabold text-charcoal">
                  {i + 1}
                </span>
                <h3 className="text-lg font-bold">{judul}</h3>
                <p className="leading-relaxed">{isi}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Harga */}
        <section id="harga" className="bg-cocoa">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-14 sm:px-6">
            <div className="flex flex-col gap-3">
              <h2 className="text-3xl font-extrabold tracking-tight text-cream sm:text-4xl">Harga yang masuk akal</h2>
              <p className="text-lg text-beige">Setiap Part berisi 1 tryout SKD lengkap. Akses 1 tahun sejak pembelian.</p>
            </div>
            <Suspense fallback={<p className="text-beige">Memuat harga…</p>}>
              <Harga />
            </Suspense>
            <p className="text-beige">Sudah beli paket soal di Drive? Cek PDF-mu, ada kode voucher 1 Part gratis.</p>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-14 sm:px-6">
          <h2 className="mb-2 text-3xl font-extrabold text-cocoa sm:text-4xl">Pertanyaan yang sering ditanya</h2>
          {faq.map(([q, a]) => (
            <details key={q} className="rounded-2xl border border-beige bg-white px-5 py-4">
              <summary className="cursor-pointer text-lg font-bold">{q}</summary>
              <p className="mt-3 leading-relaxed">{a}</p>
            </details>
          ))}
        </section>
      </main>
      <footer className="bg-charcoal text-beige">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-10 text-sm sm:px-6">
          <Image src="/brand/logo-terang.png" alt="SAHATU Academy" width={640} height={216} className="h-11 w-auto" />
          <span>© 2026 SAHATU Academy · Satu Hari Satu Soal</span>
        </div>
      </footer>
    </>
  );
}
