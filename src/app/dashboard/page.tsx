import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { requireActiveUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

async function Isi() {
  await connection(); // data login selalu dibaca saat diminta
  const user = await requireActiveUser("/dashboard");
  const db = createAdminClient();
  let partsQuery = db.from("parts").select("id, kode, nama, deskripsi, status").order("kode");
  if (user.role !== "admin") partsQuery = partsQuery.eq("status", "terbit");
  const [{ data: parts }, { data: attempts }] = await Promise.all([
    partsQuery,
    db
      .from("attempts")
      .select("id, mulai, selesai, total, lulus, percobaan_ke, parts(nama)")
      .eq("user_id", user.id)
      .order("mulai", { ascending: false })
      .limit(20),
  ]);
  const tgl = (s: string) =>
    new Date(s).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

  return (
    <>
      <h1 className="text-3xl font-extrabold text-cocoa">Halo, {user.nama ?? "pejuang NIP"}!</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-extrabold text-cocoa">Tryout</h2>
        {(parts ?? []).length === 0 && <p className="text-muted">Belum ada tryout yang terbit.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {(parts ?? []).map((p) => (
            <Link
              key={p.id}
              href={`/tryout/${p.kode}`}
              className="flex flex-col gap-1 rounded-2xl border border-beige bg-white p-5 hover:border-cocoa"
            >
              <span className="text-lg font-extrabold text-cocoa">{p.nama}</span>
              {p.deskripsi && <span className="text-sm text-muted">{p.deskripsi}</span>}
              {p.status === "draft" && <span className="text-xs font-bold text-muted">DRAFT · hanya terlihat admin</span>}
            </Link>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-extrabold text-cocoa">Riwayat</h2>
        {(attempts ?? []).length === 0 && <p className="text-muted">Belum ada percobaan.</p>}
        <ul className="flex flex-col divide-y divide-beige rounded-2xl border border-beige bg-white">
          {(attempts ?? []).map((a) => {
            const nama = (a.parts as unknown as { nama: string } | null)?.nama;
            return (
              <li key={a.id}>
                <Link
                  href={a.selesai ? `/hasil/${a.id}` : `/ujian/${a.id}`}
                  className="flex items-center justify-between gap-3 p-4"
                >
                  <span className="flex flex-col">
                    <span className="font-semibold">
                      {nama} · percobaan ke-{a.percobaan_ke}
                    </span>
                    <span className="text-sm text-muted">{tgl(a.mulai)}</span>
                  </span>
                  {a.selesai ? (
                    <span className={`text-right font-bold ${a.lulus ? "text-cocoa" : "text-danger"}`}>
                      {a.total}
                      <span className="block text-xs">{a.lulus ? "✓ Lulus" : "✕ Belum lulus"}</span>
                    </span>
                  ) : (
                    <span className="rounded-full bg-caramel px-3 py-1 text-xs font-bold text-charcoal">Berjalan</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

export default function DashboardPage() {
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
