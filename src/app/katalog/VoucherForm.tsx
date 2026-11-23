"use client";

import { useActionState } from "react";
import { tukarVoucher, type VoucherState } from "./actions";

export function VoucherForm({ parts, login }: { parts: { id: string; nama: string }[]; login: boolean }) {
  const [s, action, pending] = useActionState<VoucherState, FormData>(tukarVoucher, {});
  return (
    <form action={action} className="flex flex-col gap-3 rounded-2xl bg-beige p-5 sm:p-6">
      <label htmlFor="kode" className="text-lg font-extrabold text-cocoa">
        Punya kode voucher?
      </label>
      <p className="text-sm">Pembeli paket soal di Drive: kodenya ada di PDF kamu.</p>
      <div className="flex flex-wrap gap-2">
        <input
          id="kode"
          name="kode"
          placeholder="Contoh: SAHATU-XXXX"
          autoCapitalize="characters"
          className="min-w-0 flex-[1_1_200px] rounded-xl border-2 border-mocha bg-white px-4 py-3 uppercase"
        />
        {s.pilihPart && (
          <select name="part_id" required className="rounded-xl border-2 border-mocha bg-white px-3 py-3" aria-label="Pilih Part">
            <option value="">Pilih Part…</option>
            {parts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama}
              </option>
            ))}
          </select>
        )}
        <button disabled={pending || !login} className="rounded-xl bg-cocoa px-6 py-3 font-bold text-cream disabled:opacity-60">
          {pending ? "Memproses…" : "Tukar"}
        </button>
      </div>
      {!login && <p className="text-sm font-semibold">Masuk dulu untuk menukar voucher.</p>}
      {s.error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          ✕ {s.error}
        </p>
      )}
      {s.ok && <p className="font-semibold text-cocoa">✓ {s.ok}</p>}
    </form>
  );
}
