import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { setReportStatus } from "../actions";

type Laporan = {
  id: string;
  isi: string;
  status: "baru" | "diproses" | "selesai";
  catatan_admin: string | null;
  dibuat: string;
  user_id: string;
  questions: { id: string; nomor: number; subtes: string; parts: { nama: string } | null } | null;
};

async function Isi({ searchParams }: { searchParams: PageProps<"/admin/laporan">["searchParams"] }) {
  await connection();
  await requireAdmin();
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "aktif";
  const db = createAdminClient();
  let q = db
    .from("question_reports")
    .select("id, isi, status, catatan_admin, dibuat, user_id, questions(id, nomor, subtes, parts(nama))")
    .order("dibuat", { ascending: false })
    .limit(200);
  q = status === "aktif" ? q.neq("status", "selesai") : q.eq("status", "selesai");
  const { data } = await q;
  const rows = (data ?? []) as unknown as Laporan[];
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const { data: profil } = ids.length ? await db.from("profiles").select("id, nama").in("id", ids) : { data: [] };
  const nama = new Map((profil ?? []).map((p) => [p.id, p.nama]));
  const tgl = (s: string) =>
    new Date(s).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

  return (
    <>
      <Link href="/admin" className="text-sm font-semibold text-cocoa">
        ‹ Kembali ke admin
      </Link>
      <h1 className="text-3xl font-extrabold text-cocoa">Laporan soal</h1>
      <div className="flex gap-2">
        {[
          ["aktif", "Perlu dicek"],
          ["selesai", "Selesai"],
        ].map(([v, l]) => (
          <Link
            key={v}
            href={`/admin/laporan?status=${v}`}
            className={`rounded-full border-2 px-4 py-2 text-sm font-bold ${status === v ? "border-cocoa bg-cocoa text-cream" : "border-beige bg-white text-cocoa"}`}
          >
            {l}
          </Link>
        ))}
      </div>
      {rows.length === 0 && <p className="text-muted">Tidak ada laporan.</p>}
      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-col gap-3 rounded-2xl border border-beige bg-white p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-bold">
                {r.questions?.parts?.nama} · Soal {r.questions?.nomor} · {r.questions?.subtes}
              </span>
              <span className="text-xs text-muted">
                {nama.get(r.user_id) ?? "Peserta"} · {tgl(r.dibuat)}
              </span>
            </div>
            <p className="whitespace-pre-line rounded-xl bg-cream p-3">{r.isi}</p>
            <form action={setReportStatus.bind(null, r.id)} className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                name="status"
                defaultValue={r.status}
                className="rounded-xl border-2 border-beige bg-white px-3 py-2"
                aria-label="Status laporan"
              >
                <option value="baru">Baru</option>
                <option value="diproses">Diproses</option>
                <option value="selesai">Selesai</option>
              </select>
              <input
                name="catatan"
                defaultValue={r.catatan_admin ?? ""}
                placeholder="Catatan admin (opsional)"
                className="flex-1 rounded-xl border-2 border-beige px-3 py-2"
              />
              <button className="rounded-xl bg-cocoa px-4 py-2 font-bold text-cream">Simpan</button>
              {r.questions && (
                <Link href={`/admin/soal/${r.questions.id}`} className="rounded-xl border-2 border-cocoa px-4 py-1.5 text-center font-bold text-cocoa">
                  Edit soal
                </Link>
              )}
            </form>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function LaporanPage(props: PageProps<"/admin/laporan">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 sm:px-6">
        <Suspense fallback={<p className="text-muted">Memuat…</p>}>
          <Isi searchParams={props.searchParams} />
        </Suspense>
      </main>
    </>
  );
}
