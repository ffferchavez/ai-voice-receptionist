"use client";

import { useCallback, useEffect, useState } from "react";

type Branch = {
  id: string;
  name: string;
  slug: string;
  traffic_percent: number;
  is_live: boolean;
  updated_at: string;
};

export function BranchesTab({
  agentId,
  onChanged,
}: {
  agentId: string;
  onChanged?: () => void;
}) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/voices/agents/${agentId}/branches`);
    const data = (await r.json()) as { branches?: Branch[] };
    setBranches(data.branches ?? []);
    setLoading(false);
  }, [agentId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const createBranch = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    setError(null);
    const r = await fetch(`/api/voices/agents/${agentId}/branches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (!r.ok) {
      const data = (await r.json()) as { error?: string };
      setError(data.error ?? "Failed to create branch");
    }
    setNewName("");
    setBusy(false);
    void load();
    onChanged?.();
  };

  const applyTraffic = async () => {
    setBusy(true);
    setError(null);
    const splits = branches.map((b) => ({
      branchId: b.id,
      traffic_percent: b.traffic_percent,
    }));
    const r = await fetch(`/api/voices/agents/${agentId}/branches/traffic`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ splits }),
    });
    if (!r.ok) {
      const data = (await r.json()) as { error?: string };
      setError(data.error ?? "Failed to update traffic split");
    }
    setBusy(false);
    void load();
    onChanged?.();
  };

  const publishBranch = async (branchId: string) => {
    setBusy(true);
    setError(null);
    const r = await fetch(`/api/voices/agents/${agentId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchId }),
    });
    if (!r.ok) {
      const data = (await r.json()) as { error?: string };
      setError(data.error ?? "Failed to publish branch");
    }
    setBusy(false);
    void load();
    onChanged?.();
  };

  const updateLocalTraffic = (id: string, pct: number) => {
    setBranches((prev) =>
      prev.map((b) => (b.id === id ? { ...b, traffic_percent: pct } : b)),
    );
  };

  if (loading) return <p className="text-sm text-neutral-500">Loading branches...</p>;

  const sum = branches.reduce((a, b) => a + b.traffic_percent, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label className="text-xs font-medium text-neutral-500">New branch name</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="helion-input mt-1 w-full"
            placeholder="e.g. Experiment A"
          />
        </div>
        <button
          type="button"
          onClick={() => void createBranch()}
          disabled={busy || !newName.trim()}
          className="helion-btn-dark"
        >
          + Create branch
        </button>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-neutral-200/90">
        <table className="w-full min-w-[760px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50/90">
              <th className="px-4 py-3 font-medium text-neutral-700">Name</th>
              <th className="px-4 py-3 font-medium text-neutral-700">Traffic %</th>
              <th className="px-4 py-3 font-medium text-neutral-700">Status</th>
              <th className="px-4 py-3 font-medium text-neutral-700">Updated</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => (
              <tr key={b.id} className="border-b border-neutral-100">
                <td className="px-4 py-3">
                  <span className="font-medium text-neutral-900">{b.name}</span>
                  <p className="text-[11px] text-neutral-500">`{b.slug}`</p>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={b.traffic_percent}
                    onChange={(e) =>
                      updateLocalTraffic(b.id, Number(e.target.value) || 0)
                    }
                    className="helion-input w-20 py-1 text-[13px]"
                  />
                </td>
                <td className="px-4 py-3">
                  {b.is_live ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                      Live
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void publishBranch(b.id)}
                      disabled={busy}
                      className="rounded-full border border-neutral-200 px-2 py-0.5 text-[11px] text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
                    >
                      Publish
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-neutral-600">
                  {new Date(b.updated_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void applyTraffic()}
          disabled={busy || sum !== 100}
          className="helion-btn-dark disabled:opacity-40"
        >
          Apply traffic split
        </button>
        <span className="text-xs text-neutral-500">
          Total: {sum}% {sum !== 100 ? "(must equal 100)" : ""}
        </span>
      </div>
    </div>
  );
}
