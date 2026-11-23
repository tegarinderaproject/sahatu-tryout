import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { getPart } from "@/lib/exam/questions";
import { EXAM_SETTINGS } from "@/lib/exam/settings";
import { SUBTES } from "@/lib/exam/types";
import { startExam } from "./actions";

export function generateStaticParams() {
  return [{ part: "p0" }];
}

export default async function TryoutIntro({ params }: PageProps<"/tryout/[part]">) {
  const { part: partId } = await params;
  const part = getPart(partId);
  if (!part) notFound();
  const start = startExam.bind(null, part.id);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-bold tracking-wide text-muted">TRYOUT SKD CPNS</span>
          <h1 className="text-3xl font-extrabold text-cocoa sm:text-4xl">{part.nama}</h1>
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
                const c = EXAM_SETTINGS.subtes[s];
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
            Waktu <strong>{EXAM_SETTINGS.durasiMenit} menit</strong>. Timer tetap berjalan walaupun halaman ditutup atau
            di-refresh. Saat waktu habis, jawaban dikumpulkan otomatis.
          </li>
          <li>TWK & TIU: benar 5 poin, salah atau kosong 0. TKP: setiap opsi bernilai 1–5, kosong 0.</li>
          <li>Lulus kalau ketiga subtes memenuhi passing grade.</li>
          <li>Jawaban tersimpan otomatis setiap kali kamu memilih.</li>
        </ul>

        <form action={start}>
          <button
            type="submit"
            className="w-full rounded-xl bg-cocoa px-6 py-4 text-lg font-bold text-cream hover:bg-charcoal sm:w-auto"
          >
            Mulai tryout
          </button>
        </form>
        <p className="text-sm text-muted">
          Kalau ada tryout yang belum selesai, tombol ini melanjutkannya dengan sisa waktu yang ada.
        </p>
      </main>
    </>
  );
}
