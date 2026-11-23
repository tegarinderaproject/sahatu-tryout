import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { requireActiveUser } from "@/lib/auth";
import { finalizeAttempt, getPublicQuestions } from "@/lib/exam/data";
import { TOLERANSI_DETIK } from "@/lib/exam/settings";
import type { Label } from "@/lib/exam/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { ExamClient } from "./ExamClient";

const serverTime = () => Date.now();

async function ExamLoader({ params }: { params: PageProps<"/ujian/[attemptId]">["params"] }) {
  await connection();
  const { attemptId } = await params;
  const user = await requireActiveUser(`/ujian/${attemptId}`);
  const db = createAdminClient();
  const { data: a } = await db
    .from("attempts")
    .select("id, user_id, part_id, batas, selesai, parts(nama)")
    .eq("id", attemptId)
    .maybeSingle();
  if (!a || a.user_id !== user.id) notFound();
  if (a.selesai) redirect(`/hasil/${a.id}`);
  const deadline = new Date(a.batas).getTime();
  if (serverTime() > deadline + TOLERANSI_DETIK * 1000) {
    await finalizeAttempt(a.id);
    redirect(`/hasil/${a.id}`);
  }

  const [questions, { data: saved }] = await Promise.all([
    getPublicQuestions(a.part_id),
    db.from("answers").select("question_id, opsi_dipilih, ragu").eq("attempt_id", a.id),
  ]);
  const answers: Record<string, Label> = {};
  const ragu: Record<string, boolean> = {};
  for (const s of saved ?? []) {
    if (s.opsi_dipilih) answers[s.question_id] = s.opsi_dipilih as Label;
    if (s.ragu) ragu[s.question_id] = true;
  }
  const part = a.parts as unknown as { nama: string } | null;

  return (
    <ExamClient
      attemptId={a.id}
      partNama={part?.nama ?? "Tryout"}
      questions={questions}
      deadline={deadline}
      serverNow={serverTime()}
      initialAnswers={answers}
      initialRagu={ragu}
      userId={user.id}
      sessionId={user.sessionId}
    />
  );
}

export default function UjianPage(props: PageProps<"/ujian/[attemptId]">) {
  return (
    <Suspense fallback={<p className="flex flex-1 items-center justify-center p-10 text-muted">Menyiapkan soal…</p>}>
      <ExamLoader params={props.params} />
    </Suspense>
  );
}
