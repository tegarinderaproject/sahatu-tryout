import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Proxy (dulu "middleware"): menyegarkan sesi login Supabase di setiap permintaan halaman,
// dan mengarahkan ke /masuk kalau halaman butuh login. Pengecekan "satu perangkat aktif"
// dilakukan di server (lib/auth.ts) pada setiap halaman & aksi yang butuh login.
const PERLU_LOGIN = ["/dashboard", "/admin", "/hasil", "/ujian"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const path = request.nextUrl.pathname;
  const butuhLogin = PERLU_LOGIN.some((p) => path === p || path.startsWith(p + "/"));
  // Server action punya pengecekan login sendiri; jangan dialihkan di sini.
  const isAction = request.headers.has("next-action");
  if (!data?.claims && butuhLogin && !isAction) {
    const to = request.nextUrl.clone();
    to.pathname = "/masuk";
    to.search = `?lanjut=${encodeURIComponent(path)}`;
    return NextResponse.redirect(to);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)"],
};
