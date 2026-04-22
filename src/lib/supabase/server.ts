import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseDbSchema, getSupabasePublicEnv } from "@/lib/supabase/env";
import { getSharedAuthCookieOptions } from "@/lib/supabase/cookie-options";

const BUILD_PLACEHOLDER_URL = "http://127.0.0.1:54321";
const BUILD_PLACEHOLDER_KEY = "supabase-build-placeholder";

export async function createSupabaseServerClient() {
  let supabaseUrl: string | undefined;
  let supabaseKey: string | undefined;
  const duringProdBuild =
    process.env.NEXT_PHASE === "phase-production-build";

  try {
    const env = getSupabasePublicEnv();
    supabaseUrl = env.supabaseUrl;
    supabaseKey = env.supabaseKey;
  } catch {
    if (!duringProdBuild) {
      throw new Error("Missing Supabase public environment variables");
    }
  }

  const cookieStore = await cookies();
  const schema = getSupabaseDbSchema();

  return createServerClient(
    supabaseUrl ?? BUILD_PLACEHOLDER_URL,
    supabaseKey ?? BUILD_PLACEHOLDER_KEY,
    {
    db: { schema },
    cookieOptions: getSharedAuthCookieOptions(),
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
