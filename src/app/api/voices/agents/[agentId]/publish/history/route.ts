import { NextResponse } from "next/server";

import { getOrgContext } from "@/lib/server/require-org";

export async function GET(
  request: Request,
  context: { params: Promise<{ agentId: string }> },
) {
  const ctx = await getOrgContext();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const { agentId } = await context.params;
  const { supabase, organizationId } = ctx;
  const url = new URL(request.url);
  const limit = Math.min(20, Math.max(1, Number(url.searchParams.get("limit")) || 8));

  const { data: rows, error } = await supabase
    .from("agent_publish_events")
    .select(
      "id, branch_id, branch_slug, branch_name, actor_user_id, actor_name, traffic_snapshot, metadata, created_at",
    )
    .eq("agent_config_id", agentId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: rows ?? [] });
}
