import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { deletePart, setPartStatusForm } from "../../actions";
import { UploadForm } from "./UploadForm";

async function Isi({ params }: { params: PageProps<"/admin/part/[id]">["params"] }) {
  await connection(); // data login selalu dibaca saat diminta
  await requireAdmin();
  const { id } = await params;
  const db = createAdminClient();
  const [{ data: part }, { data: qs }, { count: percobaan }] = await Promise.all([
    db.from("parts").select("*").eq("id", id).maybeSingle(),
    db.from("questions").select("id, nomor, subtes").eq("part_id", id).order("nomor"),
    db.from("attempts").select("id", { count: "exact", head: true }).eq("part_id", id),
  ]);
  if (!part) notFound();
  const hitung = (s: string) => (qs ?? []).filter((q) => q.subtes === s).length;

  return (
    <>
      <Link href="/admin" className="text-sm font-semibold text-cocoa">
        ‹ Kembali ke admin
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold text-cocoa">{part.nama}</h1>
        <p className="text-muted">
          Alamat: /tryout/{part.kode} · {part.status} · TWK {hitung("TWK")} · TIU {hitung("TIU")} · TKP{" "}
          {hitung("TKP")} · {percobaan ?? 0} percobaan
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <form action={setPartStatusForm.bind(null, part.id)} className="flex gap-2">
          <select name="status" defaultValue={part.status} aria-label="Status Part" className="rounded-xl border-2 border-beige bg-white px-3 py-2">
            <option value="draft">Draft (tersembunyi)</option>
            <option value="segera">Segera hadir (tampil, belum bisa dibeli)</option>
            <option value="terbit">Terbit</option>
          </select>
          <button className="rounded-xl bg-cocoa px-4 py-2.5 font-bold text-cream">Simpan status</button>
        </form>
        <Link href={`/tryout/${part.kode}`} className="rounded-xl border-2 border-cocoa px-4 py-2 font-bold text-cocoa">
          Coba kerjakan
        </Link>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-beige bg-white p-5">
        <h2 className="text-xl font-extrabold text-cocoa">Upload soal</h2>
        <p className="text-sm text-muted">
          Upload mengganti semua soal Part ini. Template: bahan/Template-Upload-Soal-SAHATU.xlsx. Nama gambar di sheet
          harus sama persis dengan nama file gambar.
        </p>
        <UploadForm partId={part.id} />
      </section>

      {(qs ?? []).length > 0 && (
        <details className="rounded-2xl border border-beige bg-white p-5">
          <summary className="cursor-pointer text-lg font-extrabold text-cocoa">Edit soal satu per satu</summary>
          <div className="mt-3 grid grid-cols-8 gap-1.5 sm:grid-cols-10">
            {(qs ?? []).map((q) => (
              <Link
                key={q.id}
                href={`/admin/soal/${q.id}`}
                className="rounded-lg border border-beige py-2 text-center text-sm font-bold text-cocoa hover:border-cocoa"
              >
                {q.nomor}
              </Link>
            ))}
          </div>
        </details>
      )}

      <section className="flex flex-col gap-3 rounded-2xl border-2 border-danger/40 bg-white p-5">
        <h2 className="text-lg font-extrabold text-danger">Hapus Part</h2>
        <p className="text-sm text-muted">Menghapus Part, semua soal, gambar, dan riwayat percobaannya. Tidak bisa dibatalkan.</p>
        <form action={deletePart.bind(null, part.id)}>
          <button className="rounded-xl border-2 border-danger px-4 py-2 font-bold text-danger">Hapus Part ini</button>
        </form>
      </section>
    </>
  );
}

export default function AdminPartPage(props: PageProps<"/admin/part/[id]">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
        <Suspense fallback={<p className="text-muted">Memuat…</p>}>
          <Isi params={props.params} />
        </Suspense>
      </main>
    </>
  );
}
