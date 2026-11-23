import { NextResponse, type NextRequest } from "next/server";
import { afterLogin } from "@/lib/device";
import { createClient } from "@/lib/supabase/server";

// Link konfirmasi email (dan nanti login Google) kembali ke sini.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const r = await afterLogin();
      if (!r.error) return NextResponse.redirect(new URL("/dashboard", url.origin));
      return NextResponse.redirect(new URL(`/masuk?pesan=${encodeURIComponent(r.error)}`, url.origin));
    }
  }
  return NextResponse.redirect(new URL("/masuk?pesan=Link+tidak+valid+atau+sudah+kedaluwarsa.", url.origin));
}
