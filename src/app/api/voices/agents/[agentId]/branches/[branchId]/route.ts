import { NextResponse } from "next/server";

import { getOrgContext } from "@/lib/server/require-org";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ agentId: string; branchId: string }> },
) {
  const ctx = await getOrgContext();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const { agentId, branchId } = await context.params;
  const { supabase, organizationId } = ctx;

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { data: branch } = await supabase
    .from("agent_branches")
    .select("id, slug, is_live")
    .eq("id", branchId)
    .eq("agent_config_id", agentId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 404 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (typeof body.traffic_percent === "number") {
    patch.traffic_percent = Math.max(0, Math.min(100, Math.round(body.traffic_percent)));
  }

  if (typeof body.is_live === "boolean") {
    if (body.is_live) {
      await supabase
        .from("agent_branches")
        .update({ is_live: false })
        .eq("agent_config_id", agentId)
        .eq("organization_id", organizationId)
        .neq("id", branchId);
      patch.is_live = true;
    } else if (branch.is_live) {
      return NextResponse.json(
        { error: "Cannot disable live branch directly. Publish another branch first." },
        { status: 400 },
      );
    }
  }

  if (typeof body.config === "object" && body.config !== null) patch.config = body.config;

  const { data: updated, error } = await supabase
    .from("agent_branches")
    .update(patch)
    .eq("id", branchId)
    .eq("organization_id", organizationId)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ branch: updated });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ agentId: string; branchId: string }> },
) {
  const ctx = await getOrgContext();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const { agentId, branchId } = await context.params;
  const { supabase, organizationId } = ctx;

  const { data: branch } = await supabase
    .from("agent_branches")
    .select("slug, is_live")
    .eq("id", branchId)
    .eq("agent_config_id", agentId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  if (branch.slug === "main") {
    return NextResponse.json({ error: "Cannot delete Main branch" }, { status: 400 });
  }
  if (branch.is_live) {
    return NextResponse.json(
      { error: "Cannot delete live branch. Publish another branch first." },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("agent_branches")
    .delete()
    .eq("id", branchId)
    .eq("organization_id", organizationId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
