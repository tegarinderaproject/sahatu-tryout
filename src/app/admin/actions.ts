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
