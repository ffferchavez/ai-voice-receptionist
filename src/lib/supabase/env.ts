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
