import { NextResponse } from "next/server";

import { getOrgContext } from "@/lib/server/require-org";

export async function POST(
  request: Request,
  context: { params: Promise<{ agentId: string }> },
) {
  const ctx = await getOrgContext();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const { agentId } = await context.params;
  const { supabase, organizationId, userId } = ctx;

  let body: { branchId?: string; branchSlug?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const { data: branches, error: branchErr } = await supabase
    .from("agent_branches")
    .select("id, slug, name, traffic_percent")
    .eq("agent_config_id", agentId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (branchErr) return NextResponse.json({ error: branchErr.message }, { status: 500 });
  const allBranches = branches ?? [];
  if (allBranches.length === 0) {
    return NextResponse.json({ error: "No branches found" }, { status: 404 });
  }

  const target =
    allBranches.find((b) => (body.branchId ? b.id === body.branchId : false)) ??
    allBranches.find((b) => (body.branchSlug ? b.slug === body.branchSlug : false));
  if (!target) return NextResponse.json({ error: "Branch not found" }, { status: 404 });

  const sum = allBranches.reduce((acc, b) => acc + (b.traffic_percent ?? 0), 0);
  if (sum !== 100) {
    return NextResponse.json(
      { error: `Cannot publish: traffic split must total 100 (current ${sum}).` },
      { status: 400 },
    );
  }
  if ((target.traffic_percent ?? 0) <= 0) {
    return NextResponse.json(
      { error: "Cannot publish a branch with 0% traffic. Increase traffic first." },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const { error: clearErr } = await supabase
    .from("agent_branches")
    .update({ is_live: false, updated_at: now })
    .eq("agent_config_id", agentId)
    .eq("organization_id", organizationId);
  if (clearErr) return NextResponse.json({ error: clearErr.message }, { status: 500 });

  const { error: setErr } = await supabase
    .from("agent_branches")
    .update({ is_live: true, updated_at: now })
    .eq("id", target.id)
    .eq("agent_config_id", agentId)
    .eq("organization_id", organizationId);
  if (setErr) return NextResponse.json({ error: setErr.message }, { status: 500 });

  const { data: profile } = await supabase
    .schema("public")
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();

  const actorName = (profile as { display_name?: string | null } | null)?.display_name ?? null;

  await supabase.from("agent_publish_events").insert({
    organization_id: organizationId,
    agent_config_id: agentId,
    branch_id: target.id,
    branch_slug: target.slug,
    branch_name: target.name,
    actor_user_id: userId,
    actor_name: actorName,
    traffic_snapshot: allBranches.map((b) => ({
      id: b.id,
      slug: b.slug,
      name: b.name,
      traffic_percent: b.traffic_percent,
    })),
    metadata: { source: "workspace_publish_button" },
  });

  const { data: agentRow } = await supabase
    .from("agent_configs")
    .select("settings")
    .eq("id", agentId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  const settings =
    agentRow && typeof agentRow.settings === "object" && agentRow.settings !== null
      ? { ...(agentRow.settings as Record<string, unknown>) }
      : {};

  settings.publish = {
    branchId: target.id,
    branchSlug: target.slug,
    branchName: target.name,
    publishedAt: now,
  };

  await supabase
    .from("agent_configs")
    .update({ settings, updated_at: now })
    .eq("id", agentId)
    .eq("organization_id", organizationId);

  return NextResponse.json({
    ok: true,
    published: {
      branchId: target.id,
      branchSlug: target.slug,
      branchName: target.name,
      publishedAt: now,
      actorName,
    },
  });
}
