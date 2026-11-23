"use client";

import { useActionState } from "react";
import { saveQuestion, type ActionState } from "../../actions";

type Opsi = { label: string; teks: string | null; gambar: string | null; benar: boolean; bobot: number | null };
const input = "rounded-xl border-2 border-beige bg-white px-3 py-2.5 font-normal outline-none focus:border-cocoa";

export function EditForm({
  id,
  subtes,
  soal,
  kategori,
  pembahasan,
  opsi,
}: {
  id: string;
  subtes: string;
  soal: string;
  kategori: string | null;
  pembahasan: string;
  opsi: Opsi[];
}) {
  const [s, action, pending] = useActionState<ActionState, FormData>(saveQuestion.bind(null, id), {});
  const tkp = subtes === "TKP";
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Kategori
        <input name="kategori" defaultValue={kategori ?? ""} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Soal
        <textarea name="soal" defaultValue={soal} rows={5} className={input} />
      </label>
      {opsi.map((o) => (
        <div key={o.label} className="flex flex-col gap-1 text-sm font-semibold">
          <span>Opsi {o.label}{o.gambar ? ` (gambar: ${o.gambar})` : ""}</span>
          <div className="flex gap-2">
            <input name={`opsi_${o.label}`} defaultValue={o.teks ?? ""} className={`${input} flex-1`} aria-label={`Teks opsi ${o.label}`} />
            {tkp ? (
              <input
                name={`bobot_${o.label}`}
                type="number"
                min={1}
                max={5}
                defaultValue={o.bobot ?? ""}
                className={`${input} w-20`}
                aria-label={`Bobot opsi ${o.label}`}
              />
            ) : (
              <label className="flex items-center gap-1.5 rounded-xl border-2 border-beige px-3">
                <input type="radio" name="kunci" value={o.label} defaultChecked={o.benar} />
                Kunci
              </label>
            )}
          </div>
        </div>
      ))}
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Pembahasan
        <textarea name="pembahasan" defaultValue={pembahasan} rows={5} className={input} />
      </label>
      <button disabled={pending} className="rounded-xl bg-cocoa px-5 py-3 font-bold text-cream disabled:opacity-60 sm:self-start">
        {pending ? "Menyimpan…" : "Simpan soal"}
      </button>
      {s.error && <p role="alert" className="font-semibold text-danger">✕ {s.error}</p>}
      {s.ok && <p className="font-semibold text-cocoa">✓ {s.ok}</p>}
    </form>
  );
}
