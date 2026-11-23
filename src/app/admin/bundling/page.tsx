import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteBundle, setBundleStatus } from "../actions";
import { BundleForm } from "../forms5";

async function Isi() {
  await connection();
  await requireAdmin();
  const db = createAdminClient();
  const [{ data: parts }, { data: bundles }] = await Promise.all([
    db.from("parts").select("id, nama").neq("status", "draft").order("kode"),
    db.from("bundles").select("id, nama, harga, status, bundle_parts(parts(nama))").order("dibuat", { ascending: false }),
  ]);
  return (
    <>
      <Link href="/admin" className="text-sm font-semibold text-cocoa">‹ Kembali ke admin</Link>
      <h1 className="text-3xl font-extrabold text-cocoa">Bundling</h1>
      <section className="flex flex-col gap-3 rounded-2xl border border-beige bg-white p-5">
        <h2 className="text-lg font-extrabold text-cocoa">Buat bundling</h2>
        <p className="text-sm text-muted">Hanya Part berstatus terbit/segera yang bisa dipilih. Terbitkan bundling setelah semua Part-nya terbit.</p>
        <BundleForm parts={parts ?? []} />
      </section>
      <ul className="flex flex-col gap-3">
        {(bundles ?? []).length === 0 && <li className="text-muted">Belum ada bundling.</li>}
        {(bundles ?? []).map((b) => (
          <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-beige bg-white p-4">
            <div className="flex flex-col">
              <span className="font-bold">
                {b.nama} · Rp{b.harga.toLocaleString("id-ID")}
              </span>
              <span className="text-sm text-muted">
                {(b.bundle_parts ?? []).map((bp) => (bp.parts as unknown as { nama: string })?.nama).join(", ")} ·{" "}
                {b.status === "terbit" ? "Terbit" : "Draft"}
              </span>
            </div>
            <div className="flex gap-2">
              <form action={setBundleStatus.bind(null, b.id, b.status === "terbit" ? "draft" : "terbit")}>
                <button className="rounded-xl bg-cocoa px-4 py-2 font-bold text-cream">
                  {b.status === "terbit" ? "Jadikan draft" : "Terbitkan"}
                </button>
              </form>
              <form action={deleteBundle.bind(null, b.id)}>
                <button className="rounded-xl border-2 border-danger px-4 py-1.5 font-bold text-danger">Hapus</button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function BundlingPage() {
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
