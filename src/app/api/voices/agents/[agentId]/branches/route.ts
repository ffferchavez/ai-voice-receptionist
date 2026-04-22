import { NextResponse } from "next/server";

import { getOrgContext } from "@/lib/server/require-org";
import { uniqueBranchSlug } from "@/lib/voices/slug";

export async function GET(
  _request: Request,
  context: { params: Promise<{ agentId: string }> },
) {
  const ctx = await getOrgContext();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const { agentId } = await context.params;
  const { supabase, organizationId } = ctx;

  const { data: agent } = await supabase
    .from("agent_configs")
    .select("id")
    .eq("id", agentId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const { data: rows, error } = await supabase
    .from("agent_branches")
    .select("*")
    .eq("agent_config_id", agentId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ branches: rows ?? [] });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ agentId: string }> },
) {
  const ctx = await getOrgContext();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const { agentId } = await context.params;
  const { supabase, organizationId, userId } = ctx;

  const { data: agent } = await supabase
    .from("agent_configs")
    .select("id")
    .eq("id", agentId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  let body: { name?: string } = {};
  try {
    body = (await request.json()) as { name?: string };
  } catch {
    body = {};
  }

  const name =
    typeof body.name === "string" && body.name.trim() ? body.name.trim() : "New branch";

  const { data: existing } = await supabase
    .from("agent_branches")
    .select("slug")
    .eq("agent_config_id", agentId);

  const slugs = new Set((existing ?? []).map((r) => (r as { slug: string }).slug));
  const slug = uniqueBranchSlug(slugs, name);

  const { data: inserted, error } = await supabase
    .from("agent_branches")
    .insert({
      agent_config_id: agentId,
      organization_id: organizationId,
      name,
      slug,
      traffic_percent: 0,
      is_live: false,
      config: {},
      created_by: userId,
    })
    .select("id")
    .maybeSingle();

  if (error || !inserted) {
    return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
  }

  return NextResponse.json({ id: inserted.id });
}
