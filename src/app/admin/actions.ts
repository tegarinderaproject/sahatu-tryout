"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/exam/settings";
import { parseSoalFile } from "@/lib/soal-import";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionState = { error?: string; ok?: string };

export async function createPart(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const kode = String(form.get("kode") ?? "").trim().toLowerCase();
  const nama = String(form.get("nama") ?? "").trim();
  const deskripsi = String(form.get("deskripsi") ?? "").trim() || null;
  const harga = Number(form.get("harga") ?? 10000);
  if (!/^[a-z0-9-]{1,20}$/.test(kode)) return { error: "Kode hanya huruf kecil/angka/strip, misalnya p1." };
  if (!nama) return { error: "Nama wajib diisi." };
  const { data, error } = await createAdminClient()
    .from("parts")
    .insert({ kode, nama, deskripsi, harga: Number.isFinite(harga) ? harga : 10000 })
    .select("id")
    .single();
  if (error) return { error: /duplicate/i.test(error.message) ? "Kode sudah dipakai." : error.message };
  redirect(`/admin/part/${data.id}`);
}

export async function setPartStatus(partId: string, status: "draft" | "terbit") {
  await requireAdmin();
  await createAdminClient().from("parts").update({ status }).eq("id", partId);
  revalidatePath("/admin");
}

export async function deletePart(partId: string) {
  await requireAdmin();
  const db = createAdminClient();
  const { data: files } = await db.storage.from("soal").list(partId, { limit: 1000 });
  if (files?.length) await db.storage.from("soal").remove(files.map((f) => `${partId}/${f.name}`));
  await db.from("parts").delete().eq("id", partId);
  redirect("/admin");
}

export async function saveSettings(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const n = (k: string) => Number(form.get(k));
  const row = {
    durasi_menit: n("durasi_menit"),
    jumlah_twk: n("jumlah_twk"),
    jumlah_tiu: n("jumlah_tiu"),
    jumlah_tkp: n("jumlah_tkp"),
    pg_twk: n("pg_twk"),
    pg_tiu: n("pg_tiu"),
    pg_tkp: n("pg_tkp"),
    batas_ganti_perangkat: n("batas_ganti_perangkat"),
  };
  if (Object.values(row).some((x) => !Number.isInteger(x) || x < 0)) return { error: "Semua isian harus angka bulat." };
  const { error } = await createAdminClient().from("settings").update(row).eq("id", 1);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { ok: "Pengaturan disimpan." };
}

export type CheckResult = { errors: string[]; images: string[]; jumlah: number };

/** Langkah 1: baca & validasi file soal, kembalikan daftar gambar yang dibutuhkan. */
export async function checkSoalFile(form: FormData): Promise<CheckResult> {
  await requireAdmin();
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return { errors: ["Pilih file soal dulu."], images: [], jumlah: 0 };
  const r = await parseSoalFile(file.name, await file.arrayBuffer(), await getSettings());
  return { errors: r.errors, images: r.images, jumlah: r.questions.length };
}

/** Langkah 2: izin upload gambar langsung dari browser ke Storage (tidak lewat server, jadi tidak kena batas ukuran). */
export async function createImageUploads(partId: string, names: string[]) {
  await requireAdmin();
  const db = createAdminClient();
  const out: { name: string; path: string; token: string }[] = [];
  for (const name of names) {
    const path = `${partId}/${name}`;
    const { data, error } = await db.storage.from("soal").createSignedUploadUrl(path, { upsert: true });
    if (error || !data) throw new Error(`Gagal menyiapkan upload ${name}: ${error?.message}`);
    out.push({ name, path: data.path, token: data.token });
  }
  return out;
}

/** Langkah 3: simpan soal ke database (mengganti soal lama Part ini). */
export async function commitSoalFile(partId: string, form: FormData): Promise<{ errors: string[]; ok?: string }> {
  await requireAdmin();
  const file = form.get("file");
  if (!(file instanceof File)) return { errors: ["File soal hilang. Ulangi."] };
  const db = createAdminClient();
  const r = await parseSoalFile(file.name, await file.arrayBuffer(), await getSettings());
  if (r.errors.length) return { errors: r.errors };

  const { data: stored } = await db.storage.from("soal").list(partId, { limit: 1000 });
  const ada = new Set((stored ?? []).map((f) => f.name));
  const kurang = r.images.filter((n) => !ada.has(n));
  if (kurang.length) return { errors: kurang.map((n) => `Gambar belum ter-upload: ${n}`) };

  const { count } = await db.from("attempts").select("id", { count: "exact", head: true }).eq("part_id", partId);
  if (count) {
    return {
      errors: [
        `Part ini sudah dikerjakan ${count} kali. Mengganti soal akan merusak riwayat nilai peserta, jadi upload ditolak. Buat Part baru untuk soal yang berbeda.`,
      ],
    };
  }

  await db.from("questions").delete().eq("part_id", partId);
  const { data: inserted, error } = await db
    .from("questions")
    .insert(
      r.questions.map((q) => ({
        part_id: partId,
        nomor: q.nomor,
        subtes: q.subtes,
        kategori: q.kategori,
        soal: q.soal,
        gambar: q.gambar,
        pembahasan: q.pembahasan,
      })),
    )
    .select("id, nomor");
  if (error || !inserted) return { errors: [`Gagal menyimpan soal: ${error?.message}`] };
  const idByNomor = new Map(inserted.map((q) => [q.nomor, q.id]));
  const { error: optErr } = await db.from("options").insert(
    r.questions.flatMap((q) =>
      q.opsi.map((o) => ({
        question_id: idByNomor.get(q.nomor),
        label: o.label,
        teks: o.teks,
        gambar: o.gambar,
        benar: o.benar,
        bobot: o.bobot,
      })),
    ),
  );
  if (optErr) {
    await db.from("questions").delete().eq("part_id", partId);
    return { errors: [`Gagal menyimpan opsi: ${optErr.message}`] };
  }
  revalidatePath(`/admin/part/${partId}`);
  return { errors: [], ok: `${r.questions.length} soal tersimpan.` };
}

export async function setReportStatus(reportId: string, form: FormData) {
  await requireAdmin();
  const status = String(form.get("status") ?? "");
  if (!["baru", "diproses", "selesai"].includes(status)) return;
  await createAdminClient()
    .from("question_reports")
    .update({ status, catatan_admin: String(form.get("catatan") ?? "").trim() || null })
    .eq("id", reportId);
  revalidatePath("/admin/laporan");
}

/** Edit satu soal (teks, gambar tidak diubah di sini). Nilai percobaan lama TIDAK dihitung ulang. */
export async function saveQuestion(questionId: string, _: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const db = createAdminClient();
  const { data: q } = await db.from("questions").select("id, subtes").eq("id", questionId).maybeSingle();
  if (!q) return { error: "Soal tidak ditemukan." };
  const soal = String(form.get("soal") ?? "").trim();
  const pembahasan = String(form.get("pembahasan") ?? "").trim();
  const kategori = String(form.get("kategori") ?? "").trim() || null;
  if (!soal || !pembahasan) return { error: "Soal dan pembahasan wajib diisi." };
  const labels = ["A", "B", "C", "D", "E"] as const;
  const kunci = String(form.get("kunci") ?? "").toUpperCase();
  const bobot = labels.map((l) => Number(form.get(`bobot_${l}`)));
  if (q.subtes === "TKP") {
    if ([...bobot].sort().join("") !== "12345") return { error: "Bobot TKP harus 1–5, masing-masing sekali." };
  } else if (!labels.includes(kunci as (typeof labels)[number])) return { error: "Pilih kunci A–E." };

  const { error } = await db.from("questions").update({ soal, pembahasan, kategori }).eq("id", questionId);
  if (error) return { error: error.message };
  for (const [i, l] of labels.entries()) {
    const teks = String(form.get(`opsi_${l}`) ?? "").trim() || null;
    const { error: e } = await db
      .from("options")
      .update({
        teks,
        benar: q.subtes !== "TKP" && kunci === l,
        bobot: q.subtes === "TKP" ? bobot[i] : null,
      })
      .eq("question_id", questionId)
      .eq("label", l);
    if (e) return { error: e.message };
  }
  revalidatePath(`/admin/soal/${questionId}`);
  return { ok: "Soal disimpan. Nilai percobaan yang sudah selesai tidak dihitung ulang." };
}

// ---------------- Tahap 5: voucher, bundling, akses manual ----------------

export async function setPartStatusForm(partId: string, form: FormData) {
  await requireAdmin();
  const status = String(form.get("status") ?? "");
  if (!["draft", "segera", "terbit"].includes(status)) return;
  await createAdminClient().from("parts").update({ status }).eq("id", partId);
  revalidatePath(`/admin/part/${partId}`);
  revalidatePath("/admin");
}

export async function createVoucher(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const kode = String(form.get("kode") ?? "").trim().toUpperCase();
  const partId = String(form.get("part_id") ?? "") || null;
  const kuota = Number(form.get("kuota") ?? 1);
  const hari = Number(form.get("masa_akses_hari") ?? 365);
  const hingga = String(form.get("berlaku_hingga") ?? "");
  const catatan = String(form.get("catatan") ?? "").trim() || null;
  if (!/^[A-Z0-9-]{4,40}$/.test(kode)) return { error: "Kode 4–40 karakter: huruf, angka, atau strip." };
  if (!Number.isInteger(kuota) || kuota < 1) return { error: "Kuota minimal 1." };
  if (!Number.isInteger(hari) || hari < 1) return { error: "Masa akses minimal 1 hari." };
  const { error } = await createAdminClient().from("vouchers").insert({
    kode,
    part_id: partId,
    kuota,
    masa_akses_hari: hari,
    berlaku_hingga: hingga ? new Date(`${hingga}T23:59:59+07:00`).toISOString() : null,
    catatan,
  });
  if (error) return { error: /duplicate/i.test(error.message) ? "Kode sudah dipakai." : error.message };
  revalidatePath("/admin/voucher");
  return { ok: `Voucher ${kode} dibuat.` };
}

export async function toggleVoucher(kode: string, aktif: boolean) {
  await requireAdmin();
  await createAdminClient().from("vouchers").update({ aktif }).eq("kode", kode);
  revalidatePath("/admin/voucher");
}

export async function createBundle(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const nama = String(form.get("nama") ?? "").trim();
  const deskripsi = String(form.get("deskripsi") ?? "").trim() || null;
  const harga = Number(form.get("harga"));
  const parts = form.getAll("part_id").map(String).filter(Boolean);
  if (!nama) return { error: "Nama wajib diisi." };
  if (!Number.isInteger(harga) || harga < 0) return { error: "Harga harus angka." };
  if (parts.length < 2) return { error: "Pilih minimal 2 Part." };
  const db = createAdminClient();
  const { data, error } = await db.from("bundles").insert({ nama, deskripsi, harga }).select("id").single();
  if (error || !data) return { error: error?.message ?? "Gagal membuat bundling." };
  await db.from("bundle_parts").insert(parts.map((part_id) => ({ bundle_id: data.id, part_id })));
  revalidatePath("/admin/bundling");
  return { ok: "Bundling dibuat (status draft)." };
}

export async function setBundleStatus(bundleId: string, status: "draft" | "terbit") {
  await requireAdmin();
  await createAdminClient().from("bundles").update({ status }).eq("id", bundleId);
  revalidatePath("/admin/bundling");
}

export async function deleteBundle(bundleId: string) {
  await requireAdmin();
  await createAdminClient().from("bundles").delete().eq("id", bundleId);
  revalidatePath("/admin/bundling");
}

/** Cadangan kalau pembayaran/webhook gagal (SPEC 6.7). */
export async function grantManual(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const partIds = form.getAll("part_id").map(String).filter(Boolean);
  const hari = Number(form.get("hari") ?? 365);
  if (!email || partIds.length === 0) return { error: "Isi email dan pilih minimal 1 Part." };
  if (!Number.isInteger(hari) || hari < 1) return { error: "Jumlah hari minimal 1." };
  const db = createAdminClient();
  // Cari akun berdasarkan email (lewat Auth admin API).
  let userId: string | null = null;
  for (let page = 1; page <= 20 && !userId; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
    if (data.users.length < 1000) break;
  }
  if (!userId) return { error: "Akun dengan email itu tidak ditemukan. Minta peserta daftar dulu." };
  const hasil: string[] = [];
  for (const partId of partIds) {
    const { data, error } = await db.rpc("grant_access", { p_user: userId, p_part: partId, p_sumber: "manual", p_hari: hari });
    if (error) return { error: error.message };
    hasil.push(new Date(data as string).toLocaleDateString("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }));
  }
  revalidatePath("/admin/akses");
  return { ok: `Akses diberikan ke ${email}, berlaku sampai ${hasil.join(", ")}.` };
}
