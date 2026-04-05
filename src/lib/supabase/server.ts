import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const BUILD_PLACEHOLDER_URL = "http://127.0.0.1:54321";
const BUILD_PLACEHOLDER_KEY = "supabase-build-placeholder";

export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const duringProdBuild =
    process.env.NEXT_PHASE === "phase-production-build";

  if (!url || !anonKey) {
    if (!duringProdBuild) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
      );
    }
  }

  const cookieStore = await cookies();

  return createServerClient(
    url ?? BUILD_PLACEHOLDER_URL,
    anonKey ?? BUILD_PLACEHOLDER_KEY,
    {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component without mutable cookies; ignore.
        }
      },
    },
  },
  );
}
