import { connection } from "next/server";
import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { SiteHeader } from "@/components/SiteHeader";
import { cookies } from "next/headers";
import { DIKELUARKAN_COOKIE, PESAN_PERANGKAT_LAIN } from "@/lib/auth";
import { masuk } from "../auth/actions/actions";

async function Isi({ searchParams }: { searchParams: PageProps<"/masuk">["searchParams"] }) {
  await connection(); // data login selalu dibaca saat diminta
  const sp = await searchParams;
  const lanjut = typeof sp.lanjut === "string" ? sp.lanjut : "/dashboard";
  const dikeluarkan = (await cookies()).has(DIKELUARKAN_COOKIE);
  const pesan =
    sp.alasan === "perangkat-lain" || dikeluarkan ? PESAN_PERANGKAT_LAIN : typeof sp.pesan === "string" ? sp.pesan : null;
  return (
    <>
      {pesan && (
        <p role="alert" className="mb-5 flex gap-2 rounded-xl bg-danger/10 p-4 text-sm font-semibold text-danger">
          <span aria-hidden>!</span>
          {pesan}
        </p>
      )}
      <AuthForm
        action={masuk}
        lanjut={lanjut}
        submitLabel="Masuk"
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
        ]}
        footer={{ text: "Belum punya akun?", href: "/daftar", link: "Daftar" }}
      />
    </>
  );
}

export default function MasukPage(props: PageProps<"/masuk">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-md px-4 py-10">
        <h1 className="mb-6 text-3xl font-extrabold text-cocoa">Masuk</h1>
        <Suspense>
          <Isi searchParams={props.searchParams} />
        </Suspense>
      </main>
    </>
  );
}
