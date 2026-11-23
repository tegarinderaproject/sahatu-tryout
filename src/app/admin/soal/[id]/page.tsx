import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { EditForm } from "./EditForm";

async function Isi({ params }: { params: PageProps<"/admin/soal/[id]">["params"] }) {
  await connection();
  await requireAdmin();
  const { id } = await params;
  const { data: q } = await createAdminClient()
    .from("questions")
    .select("id, part_id, nomor, subtes, kategori, soal, gambar, pembahasan, options(label, teks, gambar, benar, bobot), parts(nama)")
    .eq("id", id)
    .maybeSingle();
  if (!q) notFound();
  const opsi = [...(q.options ?? [])].sort((a, b) => a.label.localeCompare(b.label));
  const part = q.parts as unknown as { nama: string } | null;
  return (
    <>
      <div className="flex gap-4 text-sm font-semibold text-cocoa">
        <Link href="/admin/laporan">‹ Laporan soal</Link>
        <Link href={`/admin/part/${q.part_id}`}>Part ini</Link>
      </div>
      <h1 className="text-2xl font-extrabold text-cocoa">
        {part?.nama} · Soal {q.nomor} · {q.subtes}
      </h1>
      {q.gambar && <p className="text-sm text-muted">Gambar soal: {q.gambar} (ganti gambar lewat upload ulang Part).</p>}
      <EditForm id={q.id} subtes={q.subtes} soal={q.soal} kategori={q.kategori} pembahasan={q.pembahasan} opsi={opsi} />
    </>
  );
}

export default function EditSoalPage(props: PageProps<"/admin/soal/[id]">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 sm:px-6">
        <Suspense fallback={<p className="text-muted">Memuat…</p>}>
          <Isi params={props.params} />
        </Suspense>
      </main>
    </>
  );
}
