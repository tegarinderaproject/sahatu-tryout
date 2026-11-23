import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { getActiveUser } from "@/lib/auth";
import { getPartByKode } from "@/lib/exam/data";
import { getSettings, TOLERANSI_DETIK } from "@/lib/exam/settings";
import { SUBTES } from "@/lib/exam/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { startExam } from "@/app/ujian/actions";

const sekarang = () => Date.now();

async function Isi({ params }: { params: PageProps<"/tryout/[kode]">["params"] }) {
  await connection(); // data login selalu dibaca saat diminta
  const { kode } = await params;
  const [part, settings, { user }] = await Promise.all([getPartByKode(kode), getSettings(), getActiveUser()]);
  if (!part || (part.status !== "terbit" && user?.role !== "admin")) notFound();

  let berjalan = false;
  if (user) {
    const { data } = await createAdminClient()
      .from("attempts")
      .select("batas")
      .eq("user_id", user.id)
      .eq("part_id", part.id)
      .is("selesai", null);
    berjalan = (data ?? []).some((a) => new Date(a.batas).getTime() + TOLERANSI_DETIK * 1000 > sekarang());
  }
  const start = startExam.bind(null, part.kode);

  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-bold tracking-wide text-muted">
          TRYOUT SKD CPNS{part.status === "draft" ? " · DRAFT (hanya admin)" : ""}
        </span>
        <h1 className="text-3xl font-extrabold text-cocoa sm:text-4xl">{part.nama}</h1>
        {part.deskripsi && <p className="text-muted">{part.deskripsi}</p>}
      </div>

      <section className="overflow-hidden rounded-2xl border border-beige bg-white">
        <table className="w-full text-left text-sm sm:text-base">
          <thead className="bg-beige/60 text-cocoa">
            <tr>
              <th className="px-4 py-3">Subtes</th>
              <th className="px-4 py-3">Soal</th>
              <th className="px-4 py-3">Nilai maks</th>
              <th className="px-4 py-3">Passing grade</th>
            </tr>
          </thead>
          <tbody>
            {SUBTES.map((s) => {
              const c = settings.subtes[s];
              return (
                <tr key={s} className="border-t border-beige">
                  <td className="px-4 py-3 font-bold">{s}</td>
                  <td className="px-4 py-3">{c.jumlahSoal}</td>
                  <td className="px-4 py-3">{c.jumlahSoal * 5}</td>
                  <td className="px-4 py-3">{c.passingGrade}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <ul className="flex list-disc flex-col gap-2 pl-5 leading-relaxed">
        <li>
          Waktu <strong>{settings.durasiMenit} menit</strong>. Timer berjalan di server, jadi tetap berjalan walaupun
          halaman ditutup. Saat waktu habis, jawaban dikumpulkan otomatis.
        </li>
        <li>TWK & TIU: benar 5 poin, salah atau kosong 0. TKP: setiap opsi bernilai 1–5, kosong 0.</li>
        <li>Lulus kalau ketiga subtes memenuhi passing grade.</li>
        <li>Jawaban tersimpan otomatis ke server setiap kali kamu memilih.</li>
      </ul>

      {!user ? (
        <Link
          href={`/masuk?lanjut=/tryout/${part.kode}`}
          className="w-full rounded-xl bg-cocoa px-6 py-4 text-center text-lg font-bold text-cream sm:w-auto"
        >
          Masuk untuk mulai
        </Link>
      ) : berjalan ? (
        <form action={start} className="flex flex-col gap-3 rounded-2xl border-2 border-caramel bg-white p-5">
          <p className="font-semibold">Kamu sedang mengerjakan {part.nama}. Lanjutkan di perangkat ini?</p>
          <p className="text-sm text-muted">Jawaban yang sudah tersimpan tetap ada dan timer tidak berhenti.</p>
          <button type="submit" className="rounded-xl bg-cocoa px-6 py-3.5 font-bold text-cream sm:w-auto">
            Lanjutkan tryout
          </button>
        </form>
      ) : (
        <form action={start}>
          <button
            type="submit"
            className="w-full rounded-xl bg-cocoa px-6 py-4 text-lg font-bold text-cream hover:bg-charcoal sm:w-auto"
          >
            Mulai tryout
          </button>
        </form>
      )}
    </>
  );
}

export default function TryoutIntro(props: PageProps<"/tryout/[kode]">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
        <Suspense fallback={<p className="text-muted">Memuat…</p>}>
          <Isi params={props.params} />
        </Suspense>
      </main>
    </>
  );
}
