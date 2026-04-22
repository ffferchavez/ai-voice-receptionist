import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseDbSchema, getSupabasePublicEnv } from "@/lib/supabase/env";
import { getSharedAuthCookieOptions } from "@/lib/supabase/cookie-options";

function copyCookies(from: NextResponse, to: NextResponse) {
  for (const c of from.cookies.getAll()) {
    to.cookies.set(c.name, c.value);
  }
}

function isProtectedPath(pathname: string) {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/agents")
  );
}

function isAuthPagePath(pathname: string) {
  return pathname === "/login";
}

/** Runs in `src/proxy.ts` to refresh Supabase auth cookies and gate app routes. */
export async function updateSession(request: NextRequest) {
  let supabaseUrl: string;
  let supabaseKey: string;
  try {
    ({ supabaseUrl, supabaseKey } = getSupabasePublicEnv());
  } catch {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });
  const schema = getSupabaseDbSchema();

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    db: { schema },
    cookieOptions: getSharedAuthCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (isProtectedPath(pathname) && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    copyCookies(supabaseResponse, redirectResponse);
    return redirectResponse;
  }

  if (isAuthPagePath(pathname) && user) {
    const redirectResponse = NextResponse.redirect(
      new URL("/dashboard", request.url),
    );
    copyCookies(supabaseResponse, redirectResponse);
    return redirectResponse;
  }

  return supabaseResponse;
}
