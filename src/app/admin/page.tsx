import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { CreatePartForm, SettingsForm } from "./forms";

async function Isi() {
  await connection(); // data login selalu dibaca saat diminta
  await requireAdmin();
  const db = createAdminClient();
  const [{ data: parts }, { data: settings }, { count: laporanBaru }] = await Promise.all([
    db.from("parts").select("id, kode, nama, status, harga, questions(count)").order("dibuat"),
    db.from("settings").select("*").eq("id", 1).single(),
    db.from("question_reports").select("id", { count: "exact", head: true }).eq("status", "baru"),
  ]);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold text-cocoa">Admin</h1>
        <Link href="/admin/laporan" className="rounded-xl border-2 border-cocoa px-4 py-2 font-bold text-cocoa">
          Laporan soal{laporanBaru ? ` · ${laporanBaru} baru` : ""}
        </Link>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-extrabold text-cocoa">Part tryout</h2>
        <ul className="flex flex-col divide-y divide-beige rounded-2xl border border-beige bg-white">
          {(parts ?? []).length === 0 && <li className="p-4 text-muted">Belum ada Part.</li>}
          {(parts ?? []).map((p) => {
            const jumlah = (p.questions as unknown as { count: number }[])[0]?.count ?? 0;
            return (
              <li key={p.id}>
                <Link href={`/admin/part/${p.id}`} className="flex items-center justify-between gap-3 p-4">
                  <span className="flex flex-col">
                    <span className="font-bold">{p.nama}</span>
                    <span className="text-sm text-muted">
                      /{p.kode} · {jumlah} soal · Rp{p.harga.toLocaleString("id-ID")}
                    </span>
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${p.status === "terbit" ? "bg-cocoa text-cream" : "bg-beige text-cocoa"}`}
                  >
                    {p.status === "terbit" ? "Terbit" : "Draft"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-beige bg-white p-5">
        <h2 className="text-xl font-extrabold text-cocoa">Buat Part baru</h2>
        <CreatePartForm />
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-beige bg-white p-5">
        <h2 className="text-xl font-extrabold text-cocoa">Pengaturan ujian</h2>
        <p className="text-sm text-muted">Berlaku untuk percobaan yang dimulai setelah disimpan.</p>
        <SettingsForm values={settings as Record<string, number>} />
      </section>
    </>
  );
}

export default function AdminPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
        <Suspense fallback={<p className="text-muted">Memuat…</p>}>
          <Isi />
        </Suspense>
      </main>
    </>
  );
}
