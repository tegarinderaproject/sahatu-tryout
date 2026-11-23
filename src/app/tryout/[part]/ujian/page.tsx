import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { getPart, toPublicQuestions } from "@/lib/exam/questions";
import { deadlineOf, readAttempt, serverTime } from "@/lib/exam/session";
import { ExamClient } from "./ExamClient";

export function generateStaticParams() {
  return [{ part: "p0" }];
}

async function ExamLoader({ partId }: { partId: string }) {
  await connection(); // selalu dihitung saat diminta (timer pakai jam server)
  const part = getPart(partId);
  if (!part) notFound();
  const attempt = await readAttempt(part.id);
  if (!attempt) redirect(`/tryout/${part.id}`);

  return (
    <ExamClient
      partId={part.id}
      partNama={part.nama}
      attemptId={attempt.id}
      questions={toPublicQuestions(part)}
      deadline={deadlineOf(attempt)}
      serverNow={serverTime()}
    />
  );
}

export default async function UjianPage({ params }: PageProps<"/tryout/[part]/ujian">) {
  const { part } = await params;
  return (
    <Suspense
      fallback={<p className="flex flex-1 items-center justify-center p-10 text-muted">Menyiapkan soal…</p>}
    >
      <ExamLoader partId={part} />
    </Suspense>
  );
}
