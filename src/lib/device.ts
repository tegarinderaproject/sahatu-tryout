import "server-only";

import { cookies, headers } from "next/headers";
import { createAdminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";

const DEVICE_COOKIE = "sahatu_device";

/** ID perangkat acak, disimpan di cookie browser (SPEC 5.1 poin 6). */
async function deviceId(): Promise<string> {
  const store = await cookies();
  let id = store.get(DEVICE_COOKIE)?.value;
  if (!id) {
    id = crypto.randomUUID();
    store.set(DEVICE_COOKIE, id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 400,
    });
  }
  return id;
}

function infoPerangkat(ua: string): string {
  const os = /Android/i.test(ua)
    ? "Android"
    : /iPhone|iPad|iOS/i.test(ua)
      ? "iOS"
      : /Mac OS X/i.test(ua)
        ? "macOS"
        : /Windows/i.test(ua)
          ? "Windows"
          : /Linux/i.test(ua)
            ? "Linux"
            : "Lainnya";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /SamsungBrowser/.test(ua)
      ? "Samsung Internet"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Browser lain";
  return `${browser} · ${os}`;
}

/**
 * Dipanggil tepat setelah login berhasil (SPEC 5.1):
 * 1. Cek batas ganti perangkat per 24 jam (kecuali admin).
 * 2. Catat login, jadikan sesi ini satu-satunya sesi aktif, cabut sesi lain.
 * Mengembalikan pesan error kalau login ditolak.
 */
export async function afterLogin(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: claimData } = await supabase.auth.getClaims();
  const claims = claimData?.claims;
  if (!claims?.sub) return { error: "Login gagal. Coba lagi." };
  const userId = claims.sub;
  const sessionId = String(claims.session_id ?? "");

  const admin = createAdminClient();
  const [{ data: profile }, { data: settings }] = await Promise.all([
    admin.from("profiles").select("role, active_device_id").eq("id", userId).maybeSingle(),
    admin.from("settings").select("batas_ganti_perangkat").eq("id", 1).maybeSingle(),
  ]);
  const device = await deviceId();
  const h = await headers();

  if (profile?.role !== "admin") {
    const batas = settings?.batas_ganti_perangkat ?? 3;
    const sejak = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { data: logins } = await admin
      .from("device_logins")
      .select("device_id")
      .eq("user_id", userId)
      .gte("waktu_login", sejak);
    const lain = new Set((logins ?? []).map((l) => l.device_id));
    const perangkatBaru = !lain.has(device);
    if (perangkatBaru && lain.size >= batas) {
      await supabase.auth.signOut({ scope: "local" });
      return {
        error: `Akun ini sudah login dari ${batas} perangkat berbeda dalam 24 jam terakhir. Untuk keamanan, login dari perangkat baru ditolak. Hubungi admin SAHATU kalau butuh bantuan.`,
      };
    }
  }

  const now = new Date().toISOString();
  // Tandai sesi lama sebagai dikeluarkan.
  await admin
    .from("device_logins")
    .update({ dikeluarkan_pada: now, alasan: "login_baru" })
    .eq("user_id", userId)
    .is("dikeluarkan_pada", null);
  await admin.from("device_logins").insert({
    user_id: userId,
    session_id: sessionId || null,
    device_id: device,
    info_perangkat: infoPerangkat(h.get("user-agent") ?? ""),
    ip: (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || null,
  });
  await admin
    .from("profiles")
    .update({ active_session_id: sessionId || null, active_device_id: device, active_sejak: now })
    .eq("id", userId);

  // Cabut semua sesi lain milik akun ini (refresh token lama tidak bisa dipakai lagi).
  const { data: s } = await supabase.auth.getSession();
  if (s.session?.access_token) {
    await admin.auth.admin.signOut(s.session.access_token, "others");
  }
  return {};
}
