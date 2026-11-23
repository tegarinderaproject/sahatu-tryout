"use client";

import { useActionState } from "react";
import { createPart, saveSettings, type ActionState } from "./actions";

const input = "rounded-xl border-2 border-beige bg-white px-3 py-2.5 font-normal outline-none focus:border-cocoa";

function Msg({ s }: { s: ActionState }) {
  if (s.error)
    return (
      <p role="alert" className="text-sm font-semibold text-danger">
        ✕ {s.error}
      </p>
    );
  if (s.ok) return <p className="text-sm font-semibold text-cocoa">✓ {s.ok}</p>;
  return null;
}

export function CreatePartForm() {
  const [s, action, pending] = useActionState(createPart, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Kode (untuk alamat web)
        <input name="kode" placeholder="p1" required className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Nama
        <input name="nama" placeholder="Tryout SKD Part 1" required className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold sm:col-span-2">
        Deskripsi (opsional)
        <input name="deskripsi" className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Harga (Rp)
        <input name="harga" type="number" defaultValue={10000} min={0} className={input} />
      </label>
      <div className="flex items-end">
        <button disabled={pending} className="w-full rounded-xl bg-cocoa px-5 py-3 font-bold text-cream disabled:opacity-60">
          {pending ? "Membuat…" : "Buat Part"}
        </button>
      </div>
      <div className="sm:col-span-2">
        <Msg s={s} />
      </div>
    </form>
  );
}

export function SettingsForm({ values }: { values: Record<string, number> }) {
  const [s, action, pending] = useActionState(saveSettings, {});
  const fields: [string, string][] = [
    ["durasi_menit", "Durasi (menit)"],
    ["batas_ganti_perangkat", "Batas ganti perangkat / 24 jam"],
    ["jumlah_twk", "Jumlah soal TWK"],
    ["pg_twk", "Passing grade TWK"],
    ["jumlah_tiu", "Jumlah soal TIU"],
    ["pg_tiu", "Passing grade TIU"],
    ["jumlah_tkp", "Jumlah soal TKP"],
    ["pg_tkp", "Passing grade TKP"],
  ];
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      {fields.map(([k, label]) => (
        <label key={k} className="flex flex-col gap-1 text-sm font-semibold">
          {label}
          <input name={k} type="number" min={0} defaultValue={values[k]} required className={input} />
        </label>
      ))}
      <div className="flex flex-col gap-2 sm:col-span-2">
        <button disabled={pending} className="rounded-xl bg-cocoa px-5 py-3 font-bold text-cream disabled:opacity-60 sm:self-start">
          {pending ? "Menyimpan…" : "Simpan pengaturan"}
        </button>
        <Msg s={s} />
      </div>
    </form>
  );
}
