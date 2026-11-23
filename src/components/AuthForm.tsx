"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/app/auth/actions/actions";

type Field = { name: string; label: string; type: string; autoComplete: string };

export function AuthForm({
  action,
  fields,
  submitLabel,
  lanjut,
  footer,
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  fields: Field[];
  submitLabel: string;
  lanjut?: string;
  footer: { text: string; href: string; link: string };
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-col gap-4">
      {lanjut && <input type="hidden" name="lanjut" value={lanjut} />}
      {fields.map((f) => (
        <label key={f.name} className="flex flex-col gap-1.5 font-semibold">
          {f.label}
          <input
            name={f.name}
            type={f.type}
            autoComplete={f.autoComplete}
            required
            className="rounded-xl border-2 border-beige bg-white px-4 py-3 font-normal outline-none focus:border-cocoa"
          />
        </label>
      ))}
      {state.error && (
        <p role="alert" className="flex gap-2 rounded-xl bg-danger/10 p-3 text-sm font-semibold text-danger">
          <span aria-hidden>✕</span>
          {state.error}
        </p>
      )}
      {state.info && <p className="rounded-xl bg-beige p-3 text-sm font-semibold text-cocoa">{state.info}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-cocoa px-6 py-3.5 font-bold text-cream hover:bg-charcoal disabled:opacity-60"
      >
        {pending ? "Memproses…" : submitLabel}
      </button>
      <p className="text-center text-sm text-muted">
        {footer.text}{" "}
        <Link href={footer.href} className="font-bold text-cocoa underline">
          {footer.link}
        </Link>
      </p>
    </form>
  );
}
