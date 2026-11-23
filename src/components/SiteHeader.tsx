import Image from "next/image";
import Link from "next/link";

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="border-b border-beige bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="SAHATU Academy, ke beranda">
          <Image src="/brand/logo.png" alt="SAHATU Academy" width={640} height={216} priority className="h-10 w-auto" />
        </Link>
        {children}
      </div>
    </header>
  );
}
