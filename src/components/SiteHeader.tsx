import { connection } from "next/server";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { keluar } from "@/app/auth/actions/actions";
import { getActiveUser } from "@/lib/auth";

async function UserMenu() {
  await connection(); // data login selalu dibaca saat diminta
  const { user } = await getActiveUser();
  if (!user) {
    return (
      <Link href="/masuk" className="rounded-xl bg-cocoa px-4 py-2 text-sm font-bold text-cream">
        Masuk
      </Link>
    );
  }
  return (
    <nav className="flex items-center gap-3 text-sm font-semibold text-cocoa">
      {user.role === "admin" && <Link href="/admin">Admin</Link>}
      <Link href="/dashboard">Dashboard</Link>
      <form action={keluar}>
        <button type="submit" className="rounded-xl border-2 border-beige px-3 py-1.5">
          Keluar
        </button>
      </form>
    </nav>
  );
}

export function SiteHeader() {
  return (
    <header className="border-b border-beige bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="SAHATU Academy, ke beranda">
          <Image src="/brand/logo.png" alt="SAHATU Academy" width={640} height={216} priority className="h-10 w-auto" />
        </Link>
        <Suspense fallback={null}>
          <UserMenu />
        </Suspense>
      </div>
    </header>
  );
}
