"use client";

import { useActionState } from "react";
import { createBundle, createVoucher, grantManual, type ActionState } from "./actions";

const input = "rounded-xl border-2 border-beige bg-white px-3 py-2.5 font-normal outline-none focus:border-cocoa";
type P = { id: string; nama: string };

function Msg({ s }: { s: ActionState }) {
  if (s.error) return <p role="alert" className="text-sm font-semibold text-danger">✕ {s.error}</p>;
  if (s.ok) return <p className="text-sm font-semibold text-cocoa">✓ {s.ok}</p>;
  return null;
}

export function VoucherForm({ parts }: { parts: P[] }) {
  const [s, action, pending] = useActionState(createVoucher, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Kode
        <input name="kode" placeholder="SAHATU-DRIVE" required className={`${input} uppercase`} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Part yang dibuka
        <select name="part_id" className={input} defaultValue="">
          <option value="">Peserta pilih sendiri (1 Part)</option>
          {parts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nama}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Kuota (berapa orang boleh pakai)
        <input name="kuota" type="number" min={1} defaultValue={1} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Masa akses (hari)
        <input name="masa_akses_hari" type="number" min={1} defaultValue={365} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Bisa ditukar sampai (opsional)
        <input name="berlaku_hingga" type="date" className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Catatan (opsional)
        <input name="catatan" placeholder="Untuk pembeli Drive batch 1" className={input} />
      </label>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <button disabled={pending} className="rounded-xl bg-cocoa px-5 py-3 font-bold text-cream disabled:opacity-60 sm:self-start">
          {pending ? "Membuat…" : "Buat voucher"}
        </button>
        <Msg s={s} />
      </div>
    </form>
  );
}

export function BundleForm({ parts }: { parts: P[] }) {
  const [s, action, pending] = useActionState(createBundle, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Nama
        <input name="nama" placeholder="Bundling Part 1 + 2 + 3" required className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Harga (Rp)
        <input name="harga" type="number" min={0} defaultValue={25000} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold sm:col-span-2">
        Deskripsi (opsional)
        <input name="deskripsi" className={input} />
      </label>
      <fieldset className="flex flex-wrap gap-3 sm:col-span-2">
        <legend className="mb-1 text-sm font-semibold">Isi bundling</legend>
        {parts.map((p) => (
          <label key={p.id} className="flex items-center gap-2 rounded-xl border-2 border-beige px-3 py-2">
            <input type="checkbox" name="part_id" value={p.id} />
            {p.nama}
          </label>
        ))}
      </fieldset>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <button disabled={pending} className="rounded-xl bg-cocoa px-5 py-3 font-bold text-cream disabled:opacity-60 sm:self-start">
          {pending ? "Membuat…" : "Buat bundling"}
        </button>
        <Msg s={s} />
      </div>
    </form>
  );
}

export function GrantForm({ parts }: { parts: P[] }) {
  const [s, action, pending] = useActionState(grantManual, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Email peserta
        <input name="email" type="email" required className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Lama akses (hari)
        <input name="hari" type="number" min={1} defaultValue={365} className={input} />
      </label>
      <fieldset className="flex flex-wrap gap-3 sm:col-span-2">
        <legend className="mb-1 text-sm font-semibold">Part</legend>
        {parts.map((p) => (
          <label key={p.id} className="flex items-center gap-2 rounded-xl border-2 border-beige px-3 py-2">
            <input type="checkbox" name="part_id" value={p.id} />
            {p.nama}
          </label>
        ))}
      </fieldset>
      <p className="text-xs text-muted sm:col-span-2">
        Kalau akses masih aktif, lama akses ditambahkan dari tanggal berakhir yang lama.
      </p>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <button disabled={pending} className="rounded-xl bg-cocoa px-5 py-3 font-bold text-cream disabled:opacity-60 sm:self-start">
          {pending ? "Memproses…" : "Beri akses"}
        </button>
        <Msg s={s} />
      </div>
    </form>
  );
}
