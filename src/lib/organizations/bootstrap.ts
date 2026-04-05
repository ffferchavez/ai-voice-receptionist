import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Ensures the current user belongs to at least one organization.
 * Uses the SECURITY DEFINER RPC from the initial migration.
 */
export async function ensureDefaultOrganization(
  supabase: SupabaseClient,
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> },
): Promise<string | null> {
  const { data: existing, error: selectError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (selectError) {
    console.error("[ensureDefaultOrganization] membership lookup:", selectError);
    return null;
  }

  if (existing?.organization_id) {
    return existing.organization_id;
  }

  const metaName = user.user_metadata?.full_name;
  const nameFromMeta =
    typeof metaName === "string" && metaName.trim()
      ? metaName.trim()
      : undefined;
  const base =
    nameFromMeta ??
    (user.email ? user.email.split("@")[0] : null) ??
    "Workspace";
  const orgName = `${base}'s workspace`;
  const orgSlug = `ws-${user.id.replace(/-/g, "")}`;

  const { data: orgId, error: rpcError } = await supabase.rpc(
    "create_organization_with_owner",
    { org_name: orgName, org_slug: orgSlug },
  );

  if (rpcError) {
    console.error("[ensureDefaultOrganization] create_organization_with_owner:", rpcError);
    return null;
  }

  return orgId ?? null;
}
