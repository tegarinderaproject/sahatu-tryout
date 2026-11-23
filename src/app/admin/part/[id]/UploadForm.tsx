"use client";

import { unzipSync } from "fflate";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { checkSoalFile, commitSoalFile, createImageUploads } from "../../actions";

const MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" };

/** Kumpulkan gambar dari file zip dan/atau file gambar yang dipilih, berdasarkan nama file. */
async function collectImages(files: File[]): Promise<Map<string, Blob>> {
  const out = new Map<string, Blob>();
  for (const f of files) {
    if (/\.zip$/i.test(f.name)) {
      const entries = unzipSync(new Uint8Array(await f.arrayBuffer()));
      for (const [path, bytes] of Object.entries(entries)) {
        const name = path.split("/").pop() ?? "";
        if (!name || name.startsWith(".") || path.includes("__MACOSX")) continue;
        const ext = name.split(".").pop()?.toLowerCase() ?? "";
        if (MIME[ext]) out.set(name, new Blob([bytes.slice()], { type: MIME[ext] }));
      }
    } else out.set(f.name, f);
  }
  return out;
}

export function UploadForm({ partId }: { partId: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const sheet = (formEl.elements.namedItem("file") as HTMLInputElement).files?.[0];
    const imgFiles = Array.from((formEl.elements.namedItem("gambar") as HTMLInputElement).files ?? []);
    setErrors([]);
    setOk(null);
    if (!sheet) return setErrors(["Pilih file soal (.xlsx atau .csv)."]);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", sheet);

      setStatus("Memeriksa file soal…");
      const check = await checkSoalFile(fd);
      if (check.errors.length) return setErrors(check.errors);

      if (check.images.length) {
        setStatus("Membaca gambar…");
        const imgs = await collectImages(imgFiles);
        const missing = check.images.filter((n) => !imgs.has(n));
        if (missing.length) return setErrors(missing.map((n) => `Gambar tidak ada di file yang dipilih: ${n}`));

        const uploads = await createImageUploads(partId, check.images);
        const storage = createClient().storage.from("soal");
        for (let i = 0; i < uploads.length; i++) {
          const u = uploads[i];
          setStatus(`Mengunggah gambar ${i + 1}/${uploads.length}: ${u.name}`);
          const { error } = await storage.uploadToSignedUrl(u.path, u.token, imgs.get(u.name)!, { upsert: true });
          if (error) return setErrors([`Gagal upload ${u.name}: ${error.message}`]);
        }
      }

      setStatus("Menyimpan soal ke database…");
      const r = await commitSoalFile(partId, fd);
      if (r.errors.length) return setErrors(r.errors);
      setOk(r.ok ?? "Selesai.");
      formEl.reset();
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi."]);
    } finally {
      setBusy(false);
      setStatus(null);
    }
  }

  const input = "rounded-xl border-2 border-dashed border-beige bg-cream p-3 text-sm";
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 font-semibold">
        File soal (.xlsx sheet &quot;Soal&quot;, atau .csv)
        <input name="file" type="file" accept=".xlsx,.csv" className={input} />
      </label>
      <label className="flex flex-col gap-1.5 font-semibold">
        Gambar soal (file .zip dan/atau beberapa file gambar)
        <input name="gambar" type="file" accept=".zip,image/*" multiple className={input} />
      </label>
      <button disabled={busy} className="rounded-xl bg-cocoa px-5 py-3 font-bold text-cream disabled:opacity-60 sm:self-start">
        {busy ? "Memproses…" : "Upload & simpan"}
      </button>
      {status && <p className="text-sm text-muted">{status}</p>}
      {ok && <p className="font-semibold text-cocoa">✓ {ok}</p>}
      {errors.length > 0 && (
        <div role="alert" className="flex flex-col gap-1 rounded-xl bg-danger/10 p-4 text-sm text-danger">
          <strong>✕ Upload ditolak. Perbaiki baris berikut lalu upload ulang:</strong>
          <ul className="list-disc pl-5">
            {errors.slice(0, 50).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
          {errors.length > 50 && <span>…dan {errors.length - 50} lainnya.</span>}
        </div>
      )}
    </form>
  );
}
