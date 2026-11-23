import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { requireActiveUser } from "@/lib/auth";
import { imageUrl } from "@/lib/exam/data";
import type { Label, Subtes } from "@/lib/exam/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { PembahasanList, type ItemPembahasan } from "./PembahasanList";

async function Isi({ params }: { params: PageProps<"/pembahasan/[attemptId]">["params"] }) {
  await connection();
  const { attemptId } = await params;
  const user = await requireActiveUser(`/pembahasan/${attemptId}`);
  const db = createAdminClient();
  const { data: a } = await db
    .from("attempts")
    .select("id, user_id, part_id, selesai, percobaan_ke, parts(nama)")
    .eq("id", attemptId)
    .maybeSingle();
  if (!a || a.user_id !== user.id) notFound();
  // Pembahasan & kunci hanya boleh dibuka SETELAH TO dikumpulkan (SPEC 5.6).
  if (!a.selesai) redirect(`/ujian/${a.id}`);

  const [{ data: qs }, { data: ans }] = await Promise.all([
    db
      .from("questions")
      .select("id, nomor, subtes, kategori, soal, gambar, pembahasan, options(label, teks, gambar, benar, bobot)")
      .eq("part_id", a.part_id)
      .order("nomor"),
    db.from("answers").select("question_id, opsi_dipilih, ragu").eq("attempt_id", a.id),
  ]);
  const jawab = new Map((ans ?? []).map((x) => [x.question_id, x]));
  const items: ItemPembahasan[] = (qs ?? []).map((q) => {
    const j = jawab.get(q.id);
    const opsi = [...(q.options ?? [])].sort((x, y) => x.label.localeCompare(y.label));
    const pilih = (j?.opsi_dipilih as Label | null) ?? null;
    const dipilih = opsi.find((o) => o.label === pilih);
    const subtes = q.subtes as Subtes;
    const poin = !dipilih ? 0 : subtes === "TKP" ? (dipilih.bobot ?? 0) : dipilih.benar ? 5 : 0;
    const status: ItemPembahasan["status"] = !pilih
      ? "kosong"
      : subtes === "TKP"
        ? "tkp"
        : dipilih?.benar
          ? "benar"
          : "salah";
    return {
      id: q.id,
      nomor: q.nomor,
      subtes,
      kategori: q.kategori,
      soal: q.soal,
      gambar: imageUrl(a.part_id, q.gambar),
      pembahasan: q.pembahasan,
      pilih,
      ragu: !!j?.ragu,
      poin,
      status,
      opsi: opsi.map((o) => ({
        label: o.label as Label,
        teks: o.teks,
        gambar: imageUrl(a.part_id, o.gambar),
        benar: !!o.benar,
        bobot: o.bobot,
      })),
    };
  });
  const part = a.parts as unknown as { nama: string } | null;

  return (
    <>
      <Link href={`/hasil/${a.id}`} className="text-sm font-semibold text-cocoa">
        ‹ Kembali ke hasil
      </Link>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-bold tracking-wide text-muted">
          TRYOUT SKD · {(part?.nama ?? "").toUpperCase()} · PERCOBAAN KE-{a.percobaan_ke}
        </span>
        <h1 className="text-3xl font-extrabold text-cocoa sm:text-4xl">Pembahasan</h1>
      </div>
      <PembahasanList attemptId={a.id} items={items} />
    </>
  );
}

export default function PembahasanPage(props: PageProps<"/pembahasan/[attemptId]">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
        <Suspense fallback={<p className="text-muted">Memuat pembahasan…</p>}>
          <Isi params={props.params} />
        </Suspense>
      </main>
    </>
  );
}
