import { NextResponse } from "next/server";

import { getOrgContext } from "@/lib/server/require-org";

function mergeDeep(
  base: Record<string, unknown>,
  over: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) {
    if (
      v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      typeof out[k] === "object" &&
      out[k] !== null &&
      !Array.isArray(out[k])
    ) {
      out[k] = mergeDeep(out[k] as Record<string, unknown>, v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ agentId: string }> },
) {
  const ctx = await getOrgContext();
  if (!ctx.ok) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }
  const { agentId } = await context.params;
  const { supabase, organizationId } = ctx;

  const { data: row, error } = await supabase
    .from("agent_configs")
    .select("*")
    .eq("id", agentId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ agent: row });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ agentId: string }> },
) {
  const ctx = await getOrgContext();
  if (!ctx.ok) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }
  const { agentId } = await context.params;
  const { supabase, organizationId } = ctx;

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("agent_configs")
    .select("settings")
    .eq("id", agentId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const prevSettings =
    typeof existing.settings === "object" && existing.settings !== null
      ? (existing.settings as Record<string, unknown>)
      : {};

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  const stringFields = ["name", "system_prompt", "voice_provider", "voice_id"] as const;
  for (const k of stringFields) {
    if (k in body && body[k] !== undefined) patch[k] = body[k];
  }

  if ("settings" in body && typeof body.settings === "object" && body.settings !== null) {
    patch.settings = mergeDeep(prevSettings, body.settings as Record<string, unknown>);
  }

  const { data: updated, error } = await supabase
    .from("agent_configs")
    .update(patch)
    .eq("id", agentId)
    .eq("organization_id", organizationId)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ agent: updated });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ agentId: string }> },
) {
  const ctx = await getOrgContext();
  if (!ctx.ok) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }
  const { agentId } = await context.params;
  const { supabase, organizationId } = ctx;

  const { error } = await supabase
    .from("agent_configs")
    .delete()
    .eq("id", agentId)
    .eq("organization_id", organizationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
