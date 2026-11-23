import { connection } from "next/server";
import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { requireActiveUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const waktu = (s: string) =>
  new Date(s).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" });

async function Isi() {
  await connection();
  const user = await requireActiveUser("/profil");
  const { data: logins } = await createAdminClient()
    .from("device_logins")
    .select("waktu_login, info_perangkat, session_id, dikeluarkan_pada")
    .eq("user_id", user.id)
    .order("waktu_login", { ascending: false })
    .limit(10);
  const aktif = (logins ?? []).find((l) => l.session_id === user.sessionId) ?? (logins ?? [])[0];
  return (
    <>
      <h1 className="text-3xl font-extrabold text-cocoa">Profil</h1>
      <section className="flex flex-col gap-1 rounded-2xl border border-beige bg-white p-5">
        <span className="text-lg font-extrabold">{user.nama ?? "-"}</span>
        <span className="text-muted">{user.email}</span>
      </section>
      <section className="flex flex-col gap-2 rounded-2xl border border-beige bg-white p-5">
        <h2 className="font-extrabold text-cocoa">Perangkat aktif</h2>
        {aktif ? (
          <p>
            <strong>{aktif.info_perangkat ?? "Perangkat ini"}</strong> · login {waktu(aktif.waktu_login)}
          </p>
        ) : (
          <p className="text-muted">-</p>
        )}
        <p className="text-sm text-muted">
          Satu akun hanya bisa aktif di satu perangkat. Login di perangkat lain otomatis mengeluarkan perangkat ini.
        </p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="font-extrabold text-cocoa">Riwayat login</h2>
        <ul className="flex flex-col divide-y divide-beige rounded-2xl border border-beige bg-white">
          {(logins ?? []).map((l, i) => (
            <li key={i} className="flex flex-wrap justify-between gap-2 p-3 text-sm">
              <span>{l.info_perangkat ?? "-"}</span>
              <span className="text-muted">{waktu(l.waktu_login)}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted">Ada login yang bukan kamu? Segera ganti password dan hubungi admin.</p>
      </section>
    </>
  );
}

export default function ProfilPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8 sm:px-6">
        <Suspense fallback={<p className="text-muted">Memuat…</p>}>
          <Isi />
        </Suspense>
      </main>
    </>
  );
}
