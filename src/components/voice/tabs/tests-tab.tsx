"use client";

import { useMemo, useState } from "react";

type Scenario = {
  id: string;
  name: string;
  type: string;
  input: string;
  expectedContains?: string;
};

type RunItem = {
  scenarioId: string;
  name: string;
  input: string;
  expectedContains: string | null;
  passed: boolean;
  latencyMs: number;
  reply: string;
  error: string | null;
};

type PastRun = {
  id: string;
  createdAt: string;
  agentId: string;
  agentName: string;
  total: number;
  passed: number;
  failed: number;
  status: "passed" | "failed";
  items: RunItem[];
};

export function TestsTab({
  agentId,
  settings,
  onUpdateSettings,
}: {
  agentId: string;
  settings: Record<string, unknown>;
  onUpdateSettings: (patch: Record<string, unknown>) => Promise<void>;
}) {
  const tests = (settings.tests ?? {}) as {
    scenarios?: Scenario[];
    pastRuns?: PastRun[];
  };

  const scenarios = useMemo(() => {
    const raw = tests.scenarios ?? [];
    return raw.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type ?? "Simulation",
      input: s.input ?? s.name,
      expectedContains: s.expectedContains,
    }));
  }, [tests.scenarios]);

  const pastRuns = tests.pastRuns ?? [];
  const [name, setName] = useState("");
  const [input, setInput] = useState("");
  const [expectedContains, setExpectedContains] = useState("");
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  const add = () => {
    const scenarioName = name.trim();
    const scenarioInput = input.trim() || scenarioName;
    if (!scenarioName || !scenarioInput) return;
    const next: Scenario[] = [
      ...scenarios,
      {
        id: crypto.randomUUID(),
        name: scenarioName,
        input: scenarioInput,
        expectedContains: expectedContains.trim() || undefined,
        type: "Simulation",
      },
    ];
    void onUpdateSettings({ tests: { ...tests, scenarios: next } });
    setName("");
    setInput("");
    setExpectedContains("");
  };

  const remove = (id: string) => {
    void onUpdateSettings({
      tests: { ...tests, scenarios: scenarios.filter((s) => s.id !== id) },
    });
  };

  const runAll = async () => {
    if (scenarios.length === 0) return;
    setRunning(true);
    setRunError(null);
    const r = await fetch(`/api/voices/agents/${agentId}/tests/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenarios }),
    });
    const data = (await r.json()) as { run?: PastRun; error?: string };
    if (!r.ok || !data.run) {
      setRunError(data.error ?? "Failed to run tests");
      setRunning(false);
      return;
    }
    const nextPastRuns = [data.run, ...pastRuns].slice(0, 25);
    await onUpdateSettings({
      tests: { ...tests, scenarios, pastRuns: nextPastRuns },
    });
    setRunning(false);
  };

  const latest = pastRuns[0] ?? null;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-neutral-900">Tests</h3>
          <div className="flex gap-2">
            <button
              type="button"
              className="studio-btn-soft text-[13px] disabled:opacity-40"
              onClick={() => void runAll()}
              disabled={running || scenarios.length === 0}
            >
              {running ? "Running..." : "Run all tests"}
            </button>
            <button type="button" className="studio-btn-primary text-[13px]" onClick={add}>
              Add test
            </button>
          </div>
        </div>

        {runError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {runError}
          </p>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Scenario name"
            className="studio-input min-w-[220px] text-[13px]"
          />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Customer input (defaults to name)"
            className="studio-input min-w-[220px] text-[13px]"
          />
          <input
            value={expectedContains}
            onChange={(e) => setExpectedContains(e.target.value)}
            placeholder="Expected phrase (optional)"
            className="studio-input min-w-[220px] text-[13px] sm:col-span-2"
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-neutral-200/90">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/90">
                <th className="px-4 py-3 font-medium text-neutral-700">Name</th>
                <th className="px-4 py-3 font-medium text-neutral-700">Input</th>
                <th className="px-4 py-3 font-medium text-neutral-700">Expected</th>
                <th className="px-4 py-3 font-medium text-neutral-700">Type</th>
                <th className="px-4 py-3 font-medium text-neutral-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                    No tests yet. Add a simulation scenario to validate behavior.
                  </td>
                </tr>
              ) : (
                scenarios.map((s) => (
                  <tr key={s.id} className="border-b border-neutral-100">
                    <td className="px-4 py-3 text-neutral-900">{s.name}</td>
                    <td className="px-4 py-3 text-neutral-700">{s.input}</td>
                    <td className="px-4 py-3 text-neutral-600">{s.expectedContains ?? "-"}</td>
                    <td className="px-4 py-3 text-neutral-600">{s.type}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="text-xs text-red-600 underline"
                        onClick={() => remove(s.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <aside className="rounded-xl border border-neutral-200/90 bg-neutral-50/50 p-4">
        <h4 className="text-sm font-semibold text-neutral-900">Past runs</h4>
        {pastRuns.length === 0 ? (
          <p className="mt-4 text-xs text-neutral-500">No test runs found.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {pastRuns.slice(0, 6).map((run) => (
              <li key={run.id} className="rounded-lg border border-neutral-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      run.status === "passed"
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-red-50 text-red-800"
                    }`}
                  >
                    {run.status}
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    {new Date(run.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-2 text-xs text-neutral-700">
                  {run.passed}/{run.total} passed
                </p>
                {run.failed > 0 ? (
                  <p className="mt-1 text-[11px] text-red-600">
                    {run.items.find((i) => !i.passed)?.error ??
                      "One or more scenarios failed."}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {latest ? (
          <div className="mt-4 border-t border-neutral-200 pt-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
              Latest run details
            </p>
            <div className="mt-2 space-y-2">
              {latest.items.slice(0, 3).map((item) => (
                <div
                  key={item.scenarioId}
                  className="rounded border border-neutral-200 bg-white p-2"
                >
                  <p className="text-[11px] font-medium text-neutral-800">{item.name}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] text-neutral-600">
                    {item.reply || item.error || "No output"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
