import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { formatTanggal, masihAktif } from "@/lib/access";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { GrantForm } from "../forms5";

async function Isi() {
  await connection();
  await requireAdmin();
  const db = createAdminClient();
  const [{ data: parts }, { data: ent }] = await Promise.all([
    db.from("parts").select("id, nama").neq("status", "draft").order("kode"),
    db
      .from("entitlements")
      .select("user_id, sumber, berlaku_sampai, diperbarui, parts(nama)")
      .order("diperbarui", { ascending: false })
      .limit(50),
  ]);
  const ids = [...new Set((ent ?? []).map((e) => e.user_id))];
  const { data: profil } = ids.length ? await db.from("profiles").select("id, nama").in("id", ids) : { data: [] };
  const nama = new Map((profil ?? []).map((p) => [p.id, p.nama]));
  return (
    <>
      <Link href="/admin" className="text-sm font-semibold text-cocoa">‹ Kembali ke admin</Link>
      <h1 className="text-3xl font-extrabold text-cocoa">Akses peserta</h1>
      <section className="flex flex-col gap-3 rounded-2xl border border-beige bg-white p-5">
        <h2 className="text-lg font-extrabold text-cocoa">Beri akses manual</h2>
        <p className="text-sm text-muted">Cadangan kalau pembayaran sudah masuk tapi akses belum terbuka.</p>
        <GrantForm parts={parts ?? []} />
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-extrabold text-cocoa">50 akses terbaru</h2>
        <div className="overflow-x-auto rounded-2xl border border-beige bg-white">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="bg-beige/60 text-cocoa">
              <tr>
                <th className="px-3 py-2">Peserta</th>
                <th className="px-3 py-2">Part</th>
                <th className="px-3 py-2">Sumber</th>
                <th className="px-3 py-2">Berlaku sampai</th>
              </tr>
            </thead>
            <tbody>
              {(ent ?? []).map((e, i) => (
                <tr key={i} className="border-t border-beige">
                  <td className="px-3 py-2">{nama.get(e.user_id) ?? "-"}</td>
                  <td className="px-3 py-2">{(e.parts as unknown as { nama: string } | null)?.nama}</td>
                  <td className="px-3 py-2">{e.sumber}</td>
                  <td className={`px-3 py-2 ${masihAktif(e.berlaku_sampai) ? "" : "text-danger"}`}>
                    {formatTanggal(e.berlaku_sampai)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default function AksesPage() {
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
