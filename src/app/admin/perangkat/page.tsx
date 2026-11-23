import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { keluarkanSemua, resetBatas } from "../actions";

const waktu = (s: string) =>
  new Date(s).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

const tujuhHariLalu = () => new Date(Date.now() - 7 * 86400_000).toISOString();

async function cariUser(email: string) {
  const db = createAdminClient();
  for (let page = 1; page <= 20; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    const u = data.users.find((x) => x.email?.toLowerCase() === email);
    if (u) return u;
    if (data.users.length < 1000) break;
  }
  return null;
}

async function Isi({ searchParams }: { searchParams: PageProps<"/admin/perangkat">["searchParams"] }) {
  await connection();
  await requireAdmin();
  const sp = await searchParams;
  const db = createAdminClient();
  const email = typeof sp.email === "string" ? sp.email.trim().toLowerCase() : "";
  const userIdParam = typeof sp.id === "string" ? sp.id : "";

  // Akun yang paling sering ganti perangkat dalam 7 hari (tanda dipakai bergantian).
  const sejak = tujuhHariLalu();
  const { data: log7 } = await db.from("device_logins").select("user_id, device_id").gte("waktu_login", sejak).limit(10000);
  const per = new Map<string, Set<string>>();
  for (const l of log7 ?? []) per.set(l.user_id, (per.get(l.user_id) ?? new Set()).add(l.device_id));
  const teratas = [...per].map(([id, s]) => ({ id, jumlah: s.size })).filter((x) => x.jumlah > 1).sort((a, b) => b.jumlah - a.jumlah).slice(0, 20);
  const { data: namaTeratas } = teratas.length
    ? await db.from("profiles").select("id, nama").in("id", teratas.map((t) => t.id))
    : { data: [] };
  const nama = new Map((namaTeratas ?? []).map((p) => [p.id, p.nama]));

  // Detail satu akun.
  let detail: null | {
    id: string;
    email: string;
    nama: string | null;
    role: string;
    active_sejak: string | null;
    reset_batas_at: string | null;
    logins: { waktu_login: string; info_perangkat: string | null; ip: string | null; device_id: string; dikeluarkan_pada: string | null; alasan: string | null }[];
  } = null;
  let tidakKetemu = false;
  if (email || userIdParam) {
    const u = email ? await cariUser(email) : (await db.auth.admin.getUserById(userIdParam)).data.user;
    if (!u) tidakKetemu = true;
    else {
      const [{ data: p }, { data: logins }] = await Promise.all([
        db.from("profiles").select("nama, role, active_sejak, reset_batas_at").eq("id", u.id).maybeSingle(),
        db
          .from("device_logins")
          .select("waktu_login, info_perangkat, ip, device_id, dikeluarkan_pada, alasan")
          .eq("user_id", u.id)
          .order("waktu_login", { ascending: false })
          .limit(30),
      ]);
      detail = {
        id: u.id,
        email: u.email ?? "",
        nama: p?.nama ?? null,
        role: p?.role ?? "peserta",
        active_sejak: p?.active_sejak ?? null,
        reset_batas_at: p?.reset_batas_at ?? null,
        logins: logins ?? [],
      };
    }
  }

  return (
    <>
      <Link href="/admin" className="text-sm font-semibold text-cocoa">‹ Kembali ke admin</Link>
      <h1 className="text-3xl font-extrabold text-cocoa">Perangkat & sesi</h1>

      <form className="flex flex-wrap gap-2" action="/admin/perangkat">
        <input
          name="email"
          type="email"
          defaultValue={email}
          placeholder="Email peserta"
          aria-label="Email peserta"
          className="min-w-0 flex-[1_1_240px] rounded-xl border-2 border-beige bg-white px-3 py-2.5"
        />
        <button className="rounded-xl bg-cocoa px-5 py-2.5 font-bold text-cream">Cari</button>
      </form>
      {tidakKetemu && <p className="font-semibold text-danger">✕ Akun tidak ditemukan.</p>}

      {detail && (
        <section className="flex flex-col gap-3 rounded-2xl border border-beige bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-lg font-extrabold">{detail.nama ?? "-"}</span>
              <span className="text-sm text-muted">
                {detail.email} · {detail.role}
                {detail.active_sejak ? ` · login terakhir ${waktu(detail.active_sejak)}` : ""}
              </span>
              {detail.reset_batas_at && (
                <span className="text-xs text-muted">Batas di-reset {waktu(detail.reset_batas_at)}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <form action={keluarkanSemua.bind(null, detail.id)}>
                <button className="rounded-xl border-2 border-danger px-3 py-2 text-sm font-bold text-danger">
                  Keluarkan dari semua perangkat
                </button>
              </form>
              <form action={resetBatas.bind(null, detail.id)}>
                <button className="rounded-xl border-2 border-cocoa px-3 py-2 text-sm font-bold text-cocoa">
                  Reset batas ganti perangkat
                </button>
              </form>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="border-b-2 border-beige px-2 py-2">Waktu login</th>
                  <th className="border-b-2 border-beige px-2 py-2">Perangkat</th>
                  <th className="border-b-2 border-beige px-2 py-2">IP</th>
                  <th className="border-b-2 border-beige px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {detail.logins.map((l, i) => (
                  <tr key={i}>
                    <td className="border-b border-cream px-2 py-2">{waktu(l.waktu_login)}</td>
                    <td className="border-b border-cream px-2 py-2">
                      {l.info_perangkat ?? "-"} <span className="text-xs text-muted">#{l.device_id.slice(0, 6)}</span>
                    </td>
                    <td className="border-b border-cream px-2 py-2">{l.ip ?? "-"}</td>
                    <td className="border-b border-cream px-2 py-2">
                      {l.dikeluarkan_pada ? (
                        <span className="text-muted">
                          Keluar ({l.alasan === "login_baru" ? "login di perangkat lain" : l.alasan === "admin" ? "oleh admin" : "logout"})
                        </span>
                      ) : (
                        <span className="font-bold text-cocoa">Aktif</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted">Lokasi kira-kira bisa dicek dari alamat IP (misalnya lewat situs pencari lokasi IP).</p>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-extrabold text-cocoa">Paling sering ganti perangkat · 7 hari</h2>
        <p className="text-sm text-muted">Banyak perangkat berbeda bisa jadi tanda akun dipakai bergantian.</p>
        {teratas.length === 0 && <p className="text-muted">Belum ada akun yang memakai lebih dari 1 perangkat.</p>}
        <ul className="flex flex-col divide-y divide-beige rounded-2xl border border-beige bg-white">
          {teratas.map((t) => (
            <li key={t.id}>
              <Link href={`/admin/perangkat?id=${t.id}`} className="flex justify-between p-3">
                <span className="font-semibold">{nama.get(t.id) ?? "-"}</span>
                <span className="font-bold text-cocoa">{t.jumlah} perangkat</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export default function PerangkatPage(props: PageProps<"/admin/perangkat">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-8 sm:px-6">
        <Suspense fallback={<p className="text-muted">Memuat…</p>}>
          <Isi searchParams={props.searchParams} />
        </Suspense>
      </main>
    </>
  );
}
