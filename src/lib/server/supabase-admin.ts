import { createClient } from "@supabase/supabase-js";
import { getSupabaseDbSchema } from "@/lib/supabase/env";

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase admin environment variables");
  }
  const schema = getSupabaseDbSchema();
  return createClient(url, key, {
    db: { schema },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
