import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { formatTanggal, getSemuaAkses, masihAktif } from "@/lib/access";
import { getActiveUser } from "@/lib/auth";
import { getSettings } from "@/lib/exam/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { VoucherForm } from "./VoucherForm";

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

async function Isi({ searchParams }: { searchParams: PageProps<"/katalog">["searchParams"] }) {
  await connection();
  const sp = await searchParams;
  const db = createAdminClient();
  const [{ user }, settings, { data: parts }, { data: bundles }] = await Promise.all([
    getActiveUser(),
    getSettings(),
    db.from("parts").select("id, kode, nama, deskripsi, harga, status").in("status", ["terbit", "segera"]).order("kode"),
    db.from("bundles").select("id, nama, deskripsi, harga, bundle_parts(parts(id, nama, harga))").eq("status", "terbit"),
  ]);
  const akses = user ? await getSemuaAkses(user.id) : new Map<string, string>();
  const aktif = (id: string) => {
    const s = akses.get(id);
    return masihAktif(s) ? s! : null;
  };
  const jumlahSoal = settings.subtes.TWK.jumlahSoal + settings.subtes.TIU.jumlahSoal + settings.subtes.TKP.jumlahSoal;
  const perlu = typeof sp.perlu === "string" ? (parts ?? []).find((p) => p.kode === sp.perlu) : undefined;
  const terbit = (parts ?? []).filter((p) => p.status === "terbit");

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold text-cocoa sm:text-4xl">Katalog Tryout SKD</h1>
        <p className="sm:text-lg">
          Tiap Part berisi 1 tryout lengkap: {settings.subtes.TWK.jumlahSoal} TWK, {settings.subtes.TIU.jumlahSoal} TIU,{" "}
          {settings.subtes.TKP.jumlahSoal} TKP. Akses 1 tahun sejak pembelian.
        </p>
      </div>

      {perlu && !aktif(perlu.id) && (
        <p role="alert" className="rounded-xl border-2 border-caramel bg-white p-4 font-semibold">
          Untuk mengerjakan {perlu.nama}, beli Part ini atau tukar kode voucher di bawah.
        </p>
      )}

      {(bundles ?? []).map((b) => {
        const isi = (b.bundle_parts ?? []).map((bp) => bp.parts as unknown as { id: string; nama: string; harga: number });
        const normal = isi.reduce((a, p) => a + (p?.harga ?? 0), 0);
        return (
          <section key={b.id} className="flex flex-wrap items-center justify-between gap-6 rounded-3xl bg-cocoa p-6 text-cream sm:p-8">
            <div className="flex flex-[1_1_320px] flex-col gap-2">
              <span className="self-start rounded-full bg-caramel px-3 py-1 text-xs font-extrabold text-charcoal">PALING HEMAT</span>
              <h2 className="text-2xl font-extrabold">{b.nama}</h2>
              <p className="text-beige">{b.deskripsi ?? `Berisi ${isi.map((p) => p?.nama).join(", ")}.`}</p>
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <div className="flex flex-col">
                {normal > b.harga && <span className="text-sm text-beige line-through">{rupiah(normal)}</span>}
                <span className="text-4xl font-extrabold">{rupiah(b.harga)}</span>
              </div>
              <span className="rounded-xl bg-cream px-6 py-3.5 font-extrabold text-cocoa opacity-70">Pembayaran segera dibuka</span>
            </div>
          </section>
        );
      })}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {(parts ?? []).map((p) => {
          const sampai = aktif(p.id);
          const pernah = akses.get(p.id);
          if (p.status === "segera") {
            return (
              <article key={p.id} className="flex flex-col gap-3 rounded-2xl border border-dashed border-caramel bg-white p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xl font-extrabold text-cocoa">{p.nama}</h3>
                  <span className="rounded-full bg-cream px-3 py-1 text-xs font-bold text-muted">Segera hadir</span>
                </div>
                <p className="leading-relaxed">{p.deskripsi ?? "Sedang disiapkan. Kami kabari begitu rilis."}</p>
              </article>
            );
          }
          return (
            <article key={p.id} className="flex flex-col gap-3 rounded-2xl border border-beige bg-white p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xl font-extrabold text-cocoa">{p.nama}</h3>
                {sampai ? (
                  <span className="rounded-full bg-beige px-3 py-1 text-xs font-bold text-cocoa">Sudah dimiliki</span>
                ) : (
                  <span className="text-xl font-extrabold">{rupiah(p.harga)}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-sm font-semibold">
                <span className="rounded-lg bg-cream px-2.5 py-1">{jumlahSoal} soal</span>
                <span className="rounded-lg bg-cream px-2.5 py-1">{settings.durasiMenit} menit</span>
                <span className="rounded-lg bg-cream px-2.5 py-1">Pembahasan</span>
              </div>
              <p className="text-sm text-muted">
                {sampai
                  ? `Akses sampai ${formatTanggal(sampai)}`
                  : pernah
                    ? `Akses berakhir ${formatTanggal(pernah)}`
                    : "Akses 1 tahun setelah dibeli"}
              </p>
              {sampai ? (
                <Link href={`/tryout/${p.kode}`} className="mt-auto rounded-xl bg-cocoa py-3.5 text-center font-bold text-cream">
                  Kerjakan
                </Link>
              ) : (
                <span className="mt-auto rounded-xl border-2 border-beige py-3 text-center font-bold text-muted">
                  Pembayaran QRIS segera dibuka
                </span>
              )}
            </article>
          );
        })}
      </div>

      <VoucherForm parts={terbit.map((p) => ({ id: p.id, nama: p.nama }))} login={!!user} />
    </>
  );
}

export default function KatalogPage(props: PageProps<"/katalog">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
        <Suspense fallback={<p className="text-muted">Memuat katalog…</p>}>
          <Isi searchParams={props.searchParams} />
        </Suspense>
      </main>
    </>
  );
}
