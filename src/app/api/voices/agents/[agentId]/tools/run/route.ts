import { NextResponse } from "next/server";

import { getOrgContext } from "@/lib/server/require-org";
import {
  applyTemplateVariables,
  readTemplateVariables,
} from "@/lib/voices/template-vars";

type ToolAuth =
  | { type?: "none" }
  | { type: "bearer"; bearerToken?: string }
  | { type: "basic"; username?: string; password?: string }
  | { type: "twilio"; accountSid?: string; authToken?: string };

type CustomTool = {
  id: string;
  endpoint: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  bodyTemplate?: string;
  timeoutMs?: number;
  auth?: ToolAuth;
  enabled?: boolean;
};

type RunRequest = { toolId?: string; payload?: unknown };

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Request failed";
}

export async function POST(
  request: Request,
  context: { params: Promise<{ agentId: string }> },
) {
  const ctx = await getOrgContext();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const { agentId } = await context.params;
  const { supabase, organizationId } = ctx;

  let body: RunRequest = {};
  try {
    body = (await request.json()) as RunRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.toolId) return NextResponse.json({ error: "toolId is required" }, { status: 400 });

  const { data: agentRow, error: agentErr } = await supabase
    .from("agent_configs")
    .select("settings")
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
  const tools =
    settings.tools && typeof settings.tools === "object"
      ? (settings.tools as Record<string, unknown>)
      : {};
  const customTools = Array.isArray(tools.custom) ? (tools.custom as CustomTool[]) : [];
  const tool = customTools.find((t) => t.id === body.toolId);
  if (!tool) return NextResponse.json({ error: "Tool not found" }, { status: 404 });
  if (tool.enabled === false) {
    return NextResponse.json({ error: "Tool is disabled" }, { status: 400 });
  }
  if (!tool.endpoint) {
    return NextResponse.json({ error: "Tool endpoint is required" }, { status: 400 });
  }

  const method = (tool.method ?? "POST").toUpperCase();
  const endpoint = applyTemplateVariables(tool.endpoint, vars);
  const headers = new Headers();
  for (const [key, value] of Object.entries(tool.headers ?? {})) {
    headers.set(key, applyTemplateVariables(String(value), vars));
  }

  const auth = (tool.auth ?? { type: "none" }) as ToolAuth;
  if (auth.type === "bearer" && auth.bearerToken) {
    headers.set("Authorization", `Bearer ${applyTemplateVariables(auth.bearerToken, vars)}`);
  }
  if (auth.type === "basic" && auth.username && auth.password) {
    const raw = `${applyTemplateVariables(auth.username, vars)}:${applyTemplateVariables(auth.password, vars)}`;
    headers.set("Authorization", `Basic ${Buffer.from(raw).toString("base64")}`);
  }
  if (auth.type === "twilio" && auth.accountSid && auth.authToken) {
    const raw = `${applyTemplateVariables(auth.accountSid, vars)}:${applyTemplateVariables(auth.authToken, vars)}`;
    headers.set("Authorization", `Basic ${Buffer.from(raw).toString("base64")}`);
  }

  const timeoutMs = Math.max(2000, Math.min(30000, Number(tool.timeoutMs ?? 12000)));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let requestBody: string | undefined;
  if (method !== "GET" && method !== "HEAD") {
    if (body.payload !== undefined) {
      requestBody = JSON.stringify(body.payload);
      if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    } else if (tool.bodyTemplate && tool.bodyTemplate.trim()) {
      requestBody = applyTemplateVariables(tool.bodyTemplate, vars);
      if (!headers.has("Content-Type")) {
        const trimmed = requestBody.trim();
        headers.set(
          "Content-Type",
          trimmed.startsWith("{") || trimmed.startsWith("[")
            ? "application/json"
            : "text/plain; charset=utf-8",
        );
      }
    }
  }

  try {
    const startedAt = Date.now();
    const response = await fetch(endpoint, {
      method,
      headers,
      body: requestBody,
      signal: controller.signal,
    });
    const text = await response.text();
    return NextResponse.json({
      ok: response.ok,
      status: response.status,
      elapsedMs: Date.now() - startedAt,
      responseBody: text.slice(0, 6000),
      responseContentType: response.headers.get("content-type"),
    });
  } catch (err) {
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
