type SupabasePublicEnv = {
  supabaseUrl: string;
  supabaseKey: string;
};

export function getSupabasePublicEnv(): SupabasePublicEnv {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseKey = publishableKey || anonKey;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL and a Supabase public key (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY)",
    );
  }

  return { supabaseUrl, supabaseKey };
}

export function getSupabaseDbSchema(): string {
  const publicSchema = process.env.NEXT_PUBLIC_SUPABASE_DB_SCHEMA?.trim();
  if (publicSchema) return publicSchema;

  const serverSchema = process.env.SUPABASE_VOICES_SCHEMA?.trim();
  if (serverSchema) return serverSchema;

  // Default: public. Agent tables live in public (see supabase/migrations/*public_agent_tables.sql).
  // Set NEXT_PUBLIC_SUPABASE_DB_SCHEMA=voices only if your project exposes that schema in API settings.
  return "public";
}
