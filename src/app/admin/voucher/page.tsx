import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { formatTanggal } from "@/lib/access";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { toggleVoucher } from "../actions";
import { VoucherForm } from "../forms5";

async function Isi() {
  await connection();
  await requireAdmin();
  const db = createAdminClient();
  const [{ data: parts }, { data: vouchers }] = await Promise.all([
    db.from("parts").select("id, nama").neq("status", "draft").order("kode"),
    db
      .from("vouchers")
      .select("kode, kuota, terpakai, aktif, masa_akses_hari, berlaku_hingga, catatan, parts(nama)")
      .order("dibuat", { ascending: false }),
  ]);
  return (
    <>
      <Link href="/admin" className="text-sm font-semibold text-cocoa">‹ Kembali ke admin</Link>
      <h1 className="text-3xl font-extrabold text-cocoa">Voucher</h1>
      <section className="flex flex-col gap-3 rounded-2xl border border-beige bg-white p-5">
        <h2 className="text-lg font-extrabold text-cocoa">Buat voucher</h2>
        <p className="text-sm text-muted">
          Untuk pembeli paket Drive: buat 1 kode dengan kuota sebanyak pembeli, pilih &quot;Peserta pilih sendiri&quot;.
          Setiap akun hanya bisa memakai 1 kode yang sama sekali.
        </p>
        <VoucherForm parts={parts ?? []} />
      </section>
      <ul className="flex flex-col gap-3">
        {(vouchers ?? []).length === 0 && <li className="text-muted">Belum ada voucher.</li>}
        {(vouchers ?? []).map((v) => (
          <li key={v.kode} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-beige bg-white p-4">
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-lg font-bold">{v.kode}</span>
              <span className="text-sm text-muted">
                {(v.parts as unknown as { nama: string } | null)?.nama ?? "Pilih Part sendiri"} · {v.masa_akses_hari} hari ·
                terpakai {v.terpakai}/{v.kuota}
                {v.berlaku_hingga ? ` · tukar sebelum ${formatTanggal(v.berlaku_hingga)}` : ""}
              </span>
              {v.catatan && <span className="text-xs text-muted">{v.catatan}</span>}
            </div>
            <form action={toggleVoucher.bind(null, v.kode, !v.aktif)}>
              <button className={`rounded-xl px-4 py-2 font-bold ${v.aktif ? "border-2 border-danger text-danger" : "bg-cocoa text-cream"}`}>
                {v.aktif ? "Nonaktifkan" : "Aktifkan"}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function VoucherPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 sm:px-6">
        <Suspense fallback={<p className="text-muted">Memuat…</p>}>
          <Isi />
        </Suspense>
      </main>
    </>
  );
}
