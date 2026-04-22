"use client";

import { useMemo, useState } from "react";

const SYSTEM_TOOL_KEYS = [
  { key: "end_conversation", label: "End conversation" },
  { key: "detect_language", label: "Detect language" },
  { key: "skip_turn", label: "Skip turn" },
  { key: "transfer_to_agent", label: "Transfer to agent" },
  { key: "transfer_to_number", label: "Transfer to number" },
  { key: "play_keypad_touch_tone", label: "Play keypad touch tone" },
  { key: "voicemail_detection", label: "Voicemail detection" },
] as const;

type CustomTool = {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  method: "GET" | "POST";
  enabled: boolean;
  headers?: Record<string, string>;
  bodyTemplate?: string;
  timeoutMs?: number;
  auth?: {
    type?: "none" | "bearer" | "basic" | "twilio";
    bearerToken?: string;
    username?: string;
    password?: string;
    accountSid?: string;
    authToken?: string;
  };
};

export function ToolsTab({
  agentId,
  settings,
  onUpdateSettings,
}: {
  agentId: string;
  settings: Record<string, unknown>;
  onUpdateSettings: (patch: Record<string, unknown>) => Promise<void>;
}) {
  const tools = (settings.tools ?? {}) as {
    system?: Record<string, boolean>;
    custom?: CustomTool[];
  };
  const system = tools.system ?? {};
  const customTools = useMemo(() => tools.custom ?? [], [tools.custom]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [method, setMethod] = useState<"GET" | "POST">("POST");
  const [authType, setAuthType] = useState<"none" | "bearer" | "basic" | "twilio">("none");
  const [authBearer, setAuthBearer] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [twilioSid, setTwilioSid] = useState("");
  const [twilioToken, setTwilioToken] = useState("");
  const [headersInput, setHeadersInput] = useState('{\n  "Content-Type": "application/json"\n}');
  const [bodyTemplate, setBodyTemplate] = useState('{\n  "message": "{{last_user_message}}"\n}');
  const [testPayload, setTestPayload] = useState('{\n  "message": "Hello from portfolio demo"\n}');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testingToolId, setTestingToolId] = useState<string | null>(null);

  const toggle = (key: string) => {
    const next = { ...system, [key]: !system[key] };
    void onUpdateSettings({ tools: { ...tools, system: next } });
  };

  const addTool = () => {
    if (!name.trim() || !endpoint.trim()) return;
    let parsedHeaders: Record<string, string> = {};
    try {
      const raw = JSON.parse(headersInput);
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        parsedHeaders = Object.fromEntries(
          Object.entries(raw).map(([k, v]) => [k, String(v)]),
        );
      }
    } catch {
      parsedHeaders = {};
    }
    const auth =
      authType === "bearer"
        ? { type: "bearer" as const, bearerToken: authBearer }
        : authType === "basic"
          ? { type: "basic" as const, username: authUsername, password: authPassword }
          : authType === "twilio"
            ? { type: "twilio" as const, accountSid: twilioSid, authToken: twilioToken }
            : { type: "none" as const };
    const next: CustomTool[] = [
      ...customTools,
      {
        id: crypto.randomUUID(),
        name: name.trim(),
        description: description.trim(),
        endpoint: endpoint.trim(),
        method,
        enabled: true,
        headers: parsedHeaders,
        bodyTemplate: bodyTemplate.trim(),
        timeoutMs: 12000,
        auth,
      },
    ];
    void onUpdateSettings({ tools: { ...tools, custom: next } });
    setName("");
    setDescription("");
    setEndpoint("");
    setMethod("POST");
    setAuthType("none");
    setAuthBearer("");
    setAuthUsername("");
    setAuthPassword("");
    setTwilioSid("");
    setTwilioToken("");
  };

  const toggleCustom = (id: string) => {
    const next = customTools.map((tool) =>
      tool.id === id ? { ...tool, enabled: !tool.enabled } : tool,
    );
    void onUpdateSettings({ tools: { ...tools, custom: next } });
  };

  const removeCustom = (id: string) => {
    const next = customTools.filter((tool) => tool.id !== id);
    void onUpdateSettings({ tools: { ...tools, custom: next } });
  };

  const testTool = async (toolId: string) => {
    setTestingToolId(toolId);
    setTestResult(null);
    let payload: unknown = undefined;
    try {
      payload = JSON.parse(testPayload);
    } catch {
      payload = testPayload;
    }
    const r = await fetch(`/api/voices/agents/${agentId}/tools/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolId, payload }),
    });
    const data = (await r.json()) as Record<string, unknown>;
    setTestResult(JSON.stringify(data, null, 2));
    setTestingToolId(null);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tool name"
            className="helion-input text-[13px]"
          />
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as "GET" | "POST")}
            className="helion-input text-[13px]"
          >
            <option value="POST">POST</option>
            <option value="GET">GET</option>
          </select>
          <input
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="https://api.example.com/tool"
            className="helion-input text-[13px] sm:col-span-2"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this tool does"
            className="helion-input text-[13px] sm:col-span-2"
          />
          <select
            value={authType}
            onChange={(e) =>
              setAuthType(e.target.value as "none" | "bearer" | "basic" | "twilio")
            }
            className="helion-input text-[13px] sm:col-span-2"
          >
            <option value="none">Auth: None</option>
            <option value="bearer">Auth: Bearer token</option>
            <option value="basic">Auth: Basic</option>
            <option value="twilio">Auth: Twilio</option>
          </select>
          {authType === "bearer" ? (
            <input
              value={authBearer}
              onChange={(e) => setAuthBearer(e.target.value)}
              placeholder="Bearer token (supports {{variables}})"
              className="helion-input text-[13px] sm:col-span-2"
            />
          ) : null}
          {authType === "basic" ? (
            <>
              <input
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                placeholder="Basic username"
                className="helion-input text-[13px]"
              />
              <input
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="Basic password"
                className="helion-input text-[13px]"
              />
            </>
          ) : null}
          {authType === "twilio" ? (
            <>
              <input
                value={twilioSid}
                onChange={(e) => setTwilioSid(e.target.value)}
                placeholder="Twilio Account SID (or {{twilio_account_sid}})"
                className="helion-input text-[13px]"
              />
              <input
                value={twilioToken}
                onChange={(e) => setTwilioToken(e.target.value)}
                placeholder="Twilio Auth Token (or {{twilio_auth_token}})"
                className="helion-input text-[13px]"
              />
            </>
          ) : null}
          <textarea
            value={headersInput}
            onChange={(e) => setHeadersInput(e.target.value)}
            rows={4}
            placeholder='{"Content-Type":"application/json"}'
            className="helion-input font-mono text-[12px] sm:col-span-2"
          />
          <textarea
            value={bodyTemplate}
            onChange={(e) => setBodyTemplate(e.target.value)}
            rows={4}
            placeholder="Optional request body template"
            className="helion-input font-mono text-[12px] sm:col-span-2"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="helion-btn-dark"
            onClick={addTool}
            disabled={!name.trim() || !endpoint.trim()}
          >
            Add tool
          </button>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-neutral-500">Test payload (JSON or text)</p>
          <textarea
            value={testPayload}
            onChange={(e) => setTestPayload(e.target.value)}
            rows={4}
            className="helion-input font-mono text-[12px]"
          />
          {testResult ? (
            <pre className="max-h-52 overflow-auto rounded border border-neutral-200 bg-neutral-50 p-2 text-[11px] text-neutral-700">
              {testResult}
            </pre>
          ) : null}
        </div>
        {customTools.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 px-6 py-10 text-center">
            <p className="text-sm font-medium text-neutral-700">No custom tools</p>
            <p className="mt-1 text-xs text-neutral-500">
              Add webhooks and actions your agent can call during conversations.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {customTools.map((tool) => (
              <li
                key={tool.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-2"
              >
                <div>
                  <p className="text-[13px] font-medium text-neutral-900">{tool.name}</p>
                  <p className="text-[11px] text-neutral-600">
                    {tool.method} {tool.endpoint}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCustom(tool.id)}
                    className={`rounded border px-2 py-1 text-[11px] ${
                      tool.enabled
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-neutral-200 bg-white text-neutral-600"
                    }`}
                  >
                    {tool.enabled ? "Enabled" : "Disabled"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCustom(tool.id)}
                    className="rounded border border-neutral-200 px-2 py-1 text-[11px] text-neutral-700"
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={() => void testTool(tool.id)}
                    className="rounded border border-neutral-200 px-2 py-1 text-[11px] text-neutral-700"
                    disabled={testingToolId === tool.id}
                  >
                    {testingToolId === tool.id ? "Testing..." : "Test webhook"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <aside className="rounded-xl border border-neutral-200/90 bg-white p-4 shadow-sm">
        <h4 className="text-sm font-semibold text-neutral-900">System tools</h4>
        <p className="mt-1 text-xs text-neutral-500">
          Allow the agent to perform built-in actions.
        </p>
        <ul className="mt-4 space-y-3">
          {SYSTEM_TOOL_KEYS.map(({ key, label }) => (
            <li key={key} className="flex items-center justify-between gap-3">
              <span className="text-[13px] text-neutral-800">{label}</span>
              <button
                type="button"
                role="switch"
                aria-checked={system[key] ?? false}
                onClick={() => toggle(key)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  system[key] ? "bg-neutral-900" : "bg-neutral-300"
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    system[key] ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
