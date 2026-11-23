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
      <nav className="flex items-center gap-3 text-sm font-semibold text-cocoa">
        <Link href="/katalog">Katalog</Link>
        <Link href="/masuk" className="rounded-xl bg-cocoa px-4 py-2 font-bold text-cream">
          Masuk
        </Link>
      </nav>
    );
  }
  const links: [string, string][] = [
    ["/dashboard", "Dashboard"],
    ["/katalog", "Katalog"],
    ["/ranking", "Ranking"],
    ["/riwayat", "Riwayat"],
    ["/profil", "Profil"],
    ...(user.role === "admin" ? ([["/admin", "Admin"]] as [string, string][]) : []),
  ];
  return (
    <>
      {/* Layar lebar */}
      <nav className="hidden items-center gap-4 text-sm font-semibold text-cocoa md:flex">
        {links.map(([href, label]) => (
          <Link key={href} href={href}>
            {label}
          </Link>
        ))}
        <form action={keluar}>
          <button type="submit" className="rounded-xl border-2 border-beige px-3 py-1.5">
            Keluar
          </button>
        </form>
      </nav>
      {/* HP: menu lipat */}
      <details className="relative md:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border-2 border-beige px-3 py-2 text-sm font-bold text-cocoa">
          <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Menu
        </summary>
        <div className="absolute right-0 z-40 mt-2 flex w-52 flex-col rounded-2xl border border-beige bg-white p-2 shadow-lg">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="rounded-xl px-3 py-3 font-semibold text-cocoa hover:bg-cream">
              {label}
            </Link>
          ))}
          <form action={keluar}>
            <button type="submit" className="w-full rounded-xl px-3 py-3 text-left font-semibold text-danger hover:bg-cream">
              Keluar
            </button>
          </form>
        </div>
      </details>
    </>
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
