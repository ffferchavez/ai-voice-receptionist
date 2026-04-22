import { NextResponse } from "next/server";

import { ConversationManager } from "@/lib/voice/conversation";
import { getOrgContext } from "@/lib/server/require-org";
import {
  applyTemplateVariables,
  readTemplateVariables,
} from "@/lib/voices/template-vars";

type InputScenario = {
  id?: string;
  name?: string;
  input?: string;
  expectedContains?: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ agentId: string }> },
) {
  const ctx = await getOrgContext();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const { agentId } = await context.params;
  const { supabase, organizationId } = ctx;

  let body: { scenarios?: InputScenario[] } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const inputScenarios = body.scenarios ?? [];
  if (!Array.isArray(inputScenarios) || inputScenarios.length === 0) {
    return NextResponse.json({ error: "scenarios[] is required" }, { status: 400 });
  }

  const { data: agentRow, error: agentErr } = await supabase
    .from("agent_configs")
    .select("id, name, system_prompt, settings")
    .eq("id", agentId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (agentErr) return NextResponse.json({ error: agentErr.message }, { status: 500 });
  if (!agentRow) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const settings =
    typeof agentRow.settings === "object" && agentRow.settings !== null
      ? (agentRow.settings as Record<string, unknown>)
      : {};
  const vars = readTemplateVariables(settings.variables);
  const systemPrompt = applyTemplateVariables(agentRow.system_prompt ?? "", vars);

  const runId = crypto.randomUUID();
  const startedAt = new Date();
  const mgr = ConversationManager.getInstance();
  const items: Array<{
    scenarioId: string;
    name: string;
    input: string;
    expectedContains: string | null;
    passed: boolean;
    latencyMs: number;
    reply: string;
    error: string | null;
  }> = [];

  for (const scenario of inputScenarios) {
    const scenarioName = (scenario.name ?? "Scenario").trim() || "Scenario";
    const inputRaw = (scenario.input ?? scenario.name ?? "").trim();
    const expected = (scenario.expectedContains ?? "").trim();
    if (!inputRaw) {
      items.push({
        scenarioId: scenario.id ?? crypto.randomUUID(),
        name: scenarioName,
        input: "",
        expectedContains: expected || null,
        passed: false,
        latencyMs: 0,
        reply: "",
        error: "Scenario input is empty",
      });
      continue;
    }

    const input = applyTemplateVariables(inputRaw, vars);
    const session = mgr.createSession({
      systemPrompt,
      metadata: { agentId, organizationId, scenarioName, runId, runType: "simulation" },
    });

    const t0 = Date.now();
    try {
      const result = await mgr.chat(session.id, input);
      const reply = result.text?.trim() ?? "";
      const passed =
        reply.length > 0 &&
        (expected.length === 0 || reply.toLowerCase().includes(expected.toLowerCase()));
      const item = {
        scenarioId: scenario.id ?? crypto.randomUUID(),
        name: scenarioName,
        input,
        expectedContains: expected || null,
        passed,
        latencyMs: Date.now() - t0,
        reply,
        error: null,
      };
      items.push(item);
    } catch (err) {
      items.push({
        scenarioId: scenario.id ?? crypto.randomUUID(),
        name: scenarioName,
        input,
        expectedContains: expected || null,
        passed: false,
        latencyMs: Date.now() - t0,
        reply: "",
        error: err instanceof Error ? err.message : "Run failed",
      });
    } finally {
      mgr.deleteSession(session.id);
    }
  }

  const passed = items.filter((i) => i.passed).length;
  const failed = items.length - passed;
  return NextResponse.json({
    run: {
      id: runId,
      createdAt: startedAt.toISOString(),
      agentId,
      agentName: agentRow.name,
      total: items.length,
      passed,
      failed,
      status: failed === 0 ? "passed" : "failed",
      items,
    },
  });
}
