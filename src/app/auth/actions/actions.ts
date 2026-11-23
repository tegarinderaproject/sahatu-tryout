"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { afterLogin } from "@/lib/device";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; info?: string };

/** Hanya izinkan tujuan di dalam situs ini. */
function safeNext(v: FormDataEntryValue | null): string {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/dashboard";
}

export async function masuk(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Isi email dan password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (/confirm/i.test(error.message)) return { error: "Email belum dikonfirmasi. Cek kotak masuk emailmu." };
    return { error: "Email atau password salah." };
  }
  const r = await afterLogin();
  if (r.error) return { error: r.error };
  redirect(safeNext(form.get("lanjut")));
}

export async function daftar(_: FormState, form: FormData): Promise<FormState> {
  const nama = String(form.get("nama") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!nama || !email) return { error: "Isi nama dan email." };
  if (password.length < 8) return { error: "Password minimal 8 karakter." };

  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nama }, emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) {
    if (/registered|exists/i.test(error.message)) return { error: "Email ini sudah terdaftar. Silakan masuk." };
    return { error: `Pendaftaran gagal: ${error.message}` };
  }
  if (!data.session) {
    return { info: "Akun dibuat. Cek email untuk link konfirmasi, lalu masuk." };
  }
  const r = await afterLogin();
  if (r.error) return { error: r.error };
  redirect("/dashboard");
}

export async function keluar() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims?.sub) {
    await createAdminClient()
      .from("device_logins")
      .update({ dikeluarkan_pada: new Date().toISOString(), alasan: "logout" })
      .eq("user_id", data.claims.sub)
      .eq("session_id", String(data.claims.session_id ?? ""))
      .is("dikeluarkan_pada", null);
  }
  await supabase.auth.signOut({ scope: "local" });
  redirect("/masuk");
}
