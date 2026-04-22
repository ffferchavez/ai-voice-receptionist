import { NextResponse } from "next/server";

import { getOrgContext } from "@/lib/server/require-org";
import type { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  defaultAgentSettings,
  DEFAULT_SYSTEM_PROMPT,
} from "@/lib/voices/default-settings";
import { uniqueBranchSlug } from "@/lib/voices/slug";

type AgentRow = {
  id: string;
  name: string;
  system_prompt: string;
  voice_id: string | null;
  settings: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type OrgSupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function ensureMainBranchForAgent(args: {
  supabase: OrgSupabaseClient;
  agentId: string;
  organizationId: string;
  userId: string;
  sourceName?: string;
}) {
  const { supabase, agentId, organizationId, userId, sourceName } = args;
  const { data: existing } = await supabase
    .from("agent_branches")
    .select("slug")
    .eq("agent_config_id", agentId);

  const slugs = new Set((existing ?? []).map((r) => String((r as { slug: string }).slug)));
  const slug = slugs.has("main")
    ? uniqueBranchSlug(slugs, sourceName ?? "main")
    : "main";

  const name = slug === "main" ? "Main" : sourceName ?? "Main";
  await supabase.from("agent_branches").insert({
    agent_config_id: agentId,
    organization_id: organizationId,
    name,
    slug,
    traffic_percent: 100,
    is_live: true,
    config: {},
    created_by: userId,
  });
}

export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx.ok) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }
  const { supabase, organizationId } = ctx;

  const { data: rows, error } = await supabase
    .from("agent_configs")
    .select("id, name, system_prompt, voice_id, settings, created_at, updated_at")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ agents: (rows ?? []) as AgentRow[] });
}

export async function POST(request: Request) {
  const ctx = await getOrgContext();
  if (!ctx.ok) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }
  const { supabase, userId, organizationId } = ctx;

  let body: { name?: string; duplicateFromId?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  if (body.duplicateFromId) {
    const { data: src, error: srcErr } = await supabase
      .from("agent_configs")
      .select("*")
      .eq("id", body.duplicateFromId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (srcErr || !src) {
      return NextResponse.json({ error: "Source agent not found" }, { status: 404 });
    }

    const name =
      typeof body.name === "string" && body.name.trim()
        ? body.name.trim()
        : `${src.name} (copy)`;
    const settings = defaultAgentSettings(
      typeof src.settings === "object" && src.settings !== null
        ? (src.settings as Record<string, unknown>)
        : {},
    );

    const { data: inserted, error: insErr } = await supabase
      .from("agent_configs")
      .insert({
        organization_id: organizationId,
        name,
        system_prompt: src.system_prompt ?? DEFAULT_SYSTEM_PROMPT,
        voice_provider: src.voice_provider ?? "elevenlabs",
        voice_id: src.voice_id ?? "21m00Tcm4TlvDq8ikWAM",
        settings,
        created_by: userId,
      })
      .select("id")
      .maybeSingle();

    if (insErr || !inserted) {
      return NextResponse.json(
        { error: insErr?.message ?? "Insert failed" },
        { status: 500 },
      );
    }
    await ensureMainBranchForAgent({
      supabase,
      agentId: inserted.id,
      organizationId,
      userId,
      sourceName: "Main",
    });
    return NextResponse.json({ id: inserted.id });
  }

  const name =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim()
      : "New Agent";

  const { data: inserted, error: insErr } = await supabase
    .from("agent_configs")
    .insert({
      organization_id: organizationId,
      name,
      system_prompt: DEFAULT_SYSTEM_PROMPT,
      voice_provider: "elevenlabs",
      voice_id: "21m00Tcm4TlvDq8ikWAM",
      settings: defaultAgentSettings(),
      created_by: userId,
    })
    .select("id")
    .maybeSingle();

  if (insErr || !inserted) {
    return NextResponse.json(
      { error: insErr?.message ?? "Insert failed" },
      { status: 500 },
    );
  }

  await ensureMainBranchForAgent({
    supabase,
    agentId: inserted.id,
    organizationId,
    userId,
    sourceName: "Main",
  });

  return NextResponse.json({ id: inserted.id });
}
