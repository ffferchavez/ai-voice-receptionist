import { NextResponse } from "next/server";

import { getOrgContext } from "@/lib/server/require-org";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ agentId: string }> },
) {
  const ctx = await getOrgContext();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const { agentId } = await context.params;
  const { supabase, organizationId } = ctx;

  let body: { splits?: { branchId: string; traffic_percent: number }[] } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.splits) || body.splits.length === 0) {
    return NextResponse.json({ error: "splits required" }, { status: 400 });
  }

  const sum = body.splits.reduce(
    (acc, item) => acc + (Number(item.traffic_percent) || 0),
    0,
  );
  if (sum !== 100) {
    return NextResponse.json({ error: `Traffic must sum to 100 (got ${sum})` }, { status: 400 });
  }

  const now = new Date().toISOString();
  for (const split of body.splits) {
    const pct = Math.max(0, Math.min(100, Math.round(Number(split.traffic_percent) || 0)));
    const { error } = await supabase
      .from("agent_branches")
      .update({ traffic_percent: pct, updated_at: now })
      .eq("id", split.branchId)
      .eq("agent_config_id", agentId)
      .eq("organization_id", organizationId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: rows } = await supabase
    .from("agent_branches")
    .select("*")
    .eq("agent_config_id", agentId)
    .order("created_at", { ascending: true });

  return NextResponse.json({ branches: rows ?? [] });
}
