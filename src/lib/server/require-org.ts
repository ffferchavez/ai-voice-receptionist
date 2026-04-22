import { createSupabaseServerClient } from "@/lib/supabase/server";

export type OrgContext =
  | {
      ok: true;
      supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
      userId: string;
      organizationId: string;
    }
  | { ok: false; status: number; error: string };

export async function getOrgContext(): Promise<OrgContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const { data: membership, error } = await supabase
    .schema("public")
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !membership?.organization_id) {
    return { ok: false, status: 403, error: "No organization" };
  }

  return {
    ok: true,
    supabase,
    userId: user.id,
    organizationId: membership.organization_id,
  };
}
