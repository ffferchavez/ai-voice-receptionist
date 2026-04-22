import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseDbSchema, getSupabasePublicEnv } from "@/lib/supabase/env";
import { getSharedAuthCookieOptions } from "@/lib/supabase/cookie-options";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createSupabaseBrowserClient() {
  if (browserClient) return browserClient;
  const { supabaseUrl, supabaseKey } = getSupabasePublicEnv();
  const schema = getSupabaseDbSchema();

  browserClient = createBrowserClient(supabaseUrl, supabaseKey, {
    db: { schema },
    cookieOptions: getSharedAuthCookieOptions(),
  });

  return browserClient;
}
