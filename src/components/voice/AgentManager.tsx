"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { BranchesTab } from "@/components/voice/tabs/branches-tab";
import { TestsTab } from "@/components/voice/tabs/tests-tab";
import { ToolsTab } from "@/components/voice/tabs/tools-tab";
import { VoiceAgent } from "./VoiceAgent";

export interface AgentConfig {
  id: string;
  name: string;
  systemPrompt: string;
  voiceId: string;
  voiceName: string;
  ttsModel: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface ElevenLabsVoice {
  voiceId: string;
  name: string;
  category: string;
  previewUrl: string | null;
}

const TTS_MODELS = [
  { id: "eleven_turbo_v2_5", label: "Turbo v2.5 - fastest, low latency" },
  { id: "eleven_flash_v2_5", label: "Flash v2.5 - ultra-fast" },
  { id: "eleven_multilingual_v2", label: "Multilingual v2 - best quality" },
  { id: "eleven_turbo_v2", label: "Turbo v2 - fast" },
];

const DEFAULT_SYSTEM_PROMPT = `You are a friendly and professional AI voice receptionist. Your job is to:
- Greet callers warmly and identify their needs
- Answer questions clearly and concisely
- Capture lead information (name, contact details, purpose) naturally
- Keep responses conversational and brief - you are speaking, not writing
- Avoid bullet points or long lists; use natural spoken sentences
- Reply in the same language the caller uses (English, Spanish, German, etc.). Do not translate their words into another language unless they ask you to.`;

type TabId = "configure" | "live" | "branches" | "tests" | "tools";

async function fetchAgents(): Promise<AgentConfig[]> {
  const res = await fetch("/api/voices/agents");
  const data = (await res.json()) as {
    agents?: Array<{
      id: string;
      name: string;
      system_prompt: string;
      voice_id: string | null;
      settings: Record<string, unknown> | null;
      created_at: string;
      updated_at: string;
    }>;
  };
  const rows = data.agents ?? [];
  return rows.map((r) => {
    const settings = (r.settings ?? {}) as {
      ui?: { voiceName?: string };
      ttsModel?: string;
    };
    return {
      id: r.id,
      name: r.name,
      systemPrompt: r.system_prompt || DEFAULT_SYSTEM_PROMPT,
      voiceId: r.voice_id ?? "21m00Tcm4TlvDq8ikWAM",
      voiceName: settings.ui?.voiceName ?? "Rachel",
      ttsModel: settings.ttsModel ?? "eleven_turbo_v2_5",
      settings: (r.settings ?? {}) as Record<string, unknown>,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  });
}

function AgentListItem({
  agent,
  isActive,
  onClick,
}: {
  agent: AgentConfig;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full border px-3 py-3 text-left transition-colors ${
        isActive
          ? "border border-neutral-300 bg-white"
          : "border border-transparent hover:bg-neutral-100"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center text-xs font-semibold ${
            isActive ? "bg-neutral-900 text-white" : "bg-neutral-200 text-neutral-600"
          }`}
        >
          {agent.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-neutral-900">{agent.name}</p>
          <p className="truncate text-xs text-zinc-400">{agent.voiceName}</p>
        </div>
      </div>
    </button>
  );
}

function VoicePicker({
  value,
  valueName,
  onChange,
}: {
  value: string;
  valueName: string;
  onChange: (voiceId: string, voiceName: string) => void;
}) {
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch("/api/voice/voices")
      .then(async (r) => {
        const data = (await r.json()) as { voices?: ElevenLabsVoice[]; error?: string };
        if (!r.ok) {
          setVoices([]);
          setError(
            data.error ??
              "Could not load voices - check ELEVENLABS_API_KEY and permissions",
          );
          return;
        }
        setVoices(data.voices ?? []);
        setError(null);
      })
      .catch(() => setError("Could not load voices - check ELEVENLABS_API_KEY"))
      .finally(() => setLoading(false));
  }, []);

  const selected = voices.find((v) => v.voiceId === value);

  const playPreview = () => {
    const previewUrl = selected?.previewUrl;
    if (!previewUrl) return;
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(previewUrl);
    audioRef.current = audio;
    setPreviewPlaying(true);
    audio.onended = () => setPreviewPlaying(false);
    audio.onerror = () => setPreviewPlaying(false);
    audio.play().catch(() => setPreviewPlaying(false));
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500">
        Voice
      </label>
      {error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : (
        <div className="flex gap-2">
          <select
            value={value}
            onChange={(e) => {
              const v = voices.find((x) => x.voiceId === e.target.value);
              if (v) onChange(v.voiceId, v.name);
            }}
            disabled={loading}
            className="studio-input flex-1 disabled:opacity-50"
          >
            {loading ? <option value={value}>{valueName} (loading...)</option> : null}
            {voices.map((v) => (
              <option key={v.voiceId} value={v.voiceId}>
                {v.name} ({v.category})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={playPreview}
            disabled={!selected?.previewUrl || previewPlaying}
            title="Preview voice"
            className="studio-btn-soft h-9 w-9 p-0 disabled:opacity-40"
          >
            {previewPlaying ? (
              <span className="h-3 w-3 bg-neutral-900" />
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-neutral-600">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>
      )}
      {!loading && voices.length === 0 && !error ? (
        <p className="text-xs text-neutral-400">No voices found.</p>
      ) : null}
    </div>
  );
}

function AgentEditorForm({
  agent,
  onSave,
  onDuplicate,
  onDelete,
}: {
  agent: AgentConfig;
  onSave: (updated: AgentConfig) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState<AgentConfig>(agent);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave({ ...draft, updatedAt: new Date().toISOString() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const isDirty =
    draft.name !== agent.name ||
    draft.systemPrompt !== agent.systemPrompt ||
    draft.voiceId !== agent.voiceId ||
    draft.ttsModel !== agent.ttsModel;

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-1.5">
        <label className="block text-[10px] font-medium uppercase tracking-[0.22em] text-neutral-400">
          1. Identity
        </label>
        <p className="text-sm font-medium text-neutral-900">Agent name</p>
        <input
          type="text"
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          placeholder="e.g. Sales Receptionist"
          className="studio-input"
        />
      </div>

      <div className="space-y-1.5 border-t border-neutral-200 pt-5">
        <label className="block text-[10px] font-medium uppercase tracking-[0.22em] text-neutral-400">
          2. Instructions
        </label>
        <p className="text-sm font-medium text-neutral-900">System prompt</p>
        <textarea
          value={draft.systemPrompt}
          onChange={(e) => setDraft((d) => ({ ...d, systemPrompt: e.target.value }))}
          rows={8}
          placeholder="Describe the agent role, tone, and behavior..."
          className="studio-input resize-y font-mono"
        />
      </div>

      <div className="border-t border-neutral-200 pt-5">
        <label className="mb-2 block text-[10px] font-medium uppercase tracking-[0.22em] text-neutral-400">
          3. Voice
        </label>
        <VoicePicker
          value={draft.voiceId}
          valueName={draft.voiceName}
          onChange={(voiceId, voiceName) => setDraft((d) => ({ ...d, voiceId, voiceName }))}
        />
      </div>

      <div className="space-y-1.5 border-t border-neutral-200 pt-5">
        <label className="block text-[10px] font-medium uppercase tracking-[0.22em] text-neutral-400">
          4. Speech model
        </label>
        <select
          value={draft.ttsModel}
          onChange={(e) => setDraft((d) => ({ ...d, ttsModel: e.target.value }))}
          className="studio-input"
        >
          {TTS_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2 border-t border-neutral-200 pt-5">
        <button onClick={handleSave} disabled={!isDirty} className="studio-btn-primary">
          {saved ? "Saved" : "Save changes"}
        </button>
        <button onClick={onDuplicate} className="studio-btn-soft">
          Duplicate
        </button>
        <div className="flex-1" />
        <button
          onClick={() => {
            if (confirm(`Delete "${agent.name}"? This cannot be undone.`)) onDelete();
          }}
          className="studio-btn-soft border-red-200 text-red-700 hover:bg-red-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export function AgentManager() {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("configure");
  const [saving, setSaving] = useState(false);
  const resolvedActiveId = activeId ?? agents[0]?.id ?? null;
  const activeAgent = agents.find((a) => a.id === resolvedActiveId) ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchAgents();
      setAgents(list);
      if (!activeId && list[0]) setActiveId(list[0].id);
      if (activeId && !list.some((a) => a.id === activeId)) setActiveId(list[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load agents.");
    } finally {
      setLoading(false);
    }
  }, [activeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = useCallback(() => {
    void (async () => {
      setSaving(true);
      const r = await fetch("/api/voices/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await r.json()) as { id?: string; error?: string };
      setSaving(false);
      if (!r.ok || !data.id) {
        setError(data.error ?? "Could not create agent.");
        return;
      }
      await load();
      setActiveId(data.id);
      setTab("configure");
    })();
  }, [load]);

  const handleDuplicate = useCallback(() => {
    if (!activeAgent) return;
    void (async () => {
      setSaving(true);
      const r = await fetch("/api/voices/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duplicateFromId: activeAgent.id,
          name: `${activeAgent.name} (copy)`,
        }),
      });
      const data = (await r.json()) as { id?: string; error?: string };
      setSaving(false);
      if (!r.ok || !data.id) {
        setError(data.error ?? "Could not duplicate agent.");
        return;
      }
      await load();
      setActiveId(data.id);
      setTab("configure");
    })();
  }, [activeAgent, load]);

  const handleSave = useCallback(
    (updated: AgentConfig) => {
      void (async () => {
        setSaving(true);
        const r = await fetch(`/api/voices/agents/${updated.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: updated.name,
            system_prompt: updated.systemPrompt,
            voice_id: updated.voiceId,
            settings: {
              ui: { voiceName: updated.voiceName },
              ttsModel: updated.ttsModel,
            },
          }),
        });
        const data = (await r.json()) as { error?: string };
        setSaving(false);
        if (!r.ok) {
          setError(data.error ?? "Could not save agent.");
          return;
        }
        await load();
      })();
    },
    [load],
  );

  const handleUpdateSettings = useCallback(
    async (settingsPatch: Record<string, unknown>) => {
      if (!activeAgent) return;
      const r = await fetch(`/api/voices/agents/${activeAgent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: settingsPatch }),
      });
      const data = (await r.json()) as { error?: string };
      if (!r.ok) {
        throw new Error(data.error ?? "Could not update settings.");
      }
      await load();
    },
    [activeAgent, load],
  );

  const handleDelete = useCallback(() => {
    if (!activeAgent) return;
    void (async () => {
      setSaving(true);
      const r = await fetch(`/api/voices/agents/${activeAgent.id}`, { method: "DELETE" });
      const data = (await r.json()) as { error?: string };
      setSaving(false);
      if (!r.ok) {
        setError(data.error ?? "Could not delete agent.");
        return;
      }
      await load();
      setActiveId(null);
    })();
  }, [activeAgent, load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-neutral-500">
        Loading agents...
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-neutral-900">No agents yet</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Create your first AI voice agent to get started.
          </p>
        </div>
        <button
          onClick={handleCreate}
          disabled={saving}
          className="studio-btn-primary"
        >
          + Create agent
        </button>
      </div>
    );
  }

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: "configure", label: "Agent" },
    { id: "live", label: "Live Test" },
    { id: "branches", label: "Branches" },
    { id: "tests", label: "Tests" },
    { id: "tools", label: "Tools" },
  ];

  return (
    <div className="grid min-h-[640px] grid-cols-1 gap-0 overflow-hidden border border-neutral-300 bg-white md:grid-cols-[260px_1fr]">
      <div className="flex flex-col border-b border-neutral-300 bg-neutral-50/70 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between border-b border-neutral-300 px-4 py-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
            Agent profiles
          </span>
          <button
            onClick={handleCreate}
            title="Create new agent"
            disabled={saving}
            className="studio-btn-soft h-7 w-7 p-0 text-lg leading-none"
          >
            +
          </button>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {agents.map((a) => (
            <AgentListItem
              key={a.id}
              agent={a}
              isActive={a.id === resolvedActiveId}
              onClick={() => {
                setActiveId(a.id);
                setTab("configure");
              }}
            />
          ))}
        </div>
      </div>

      {activeAgent ? (
        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b border-neutral-300 px-6 py-4">
            <div>
              <p className="studio-kicker">Configuration</p>
              <h2 className="mt-1 text-lg font-semibold text-neutral-900">{activeAgent.name}</h2>
            </div>
            <div className="flex overflow-hidden border border-neutral-300 text-[12px]">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-4 py-1.5 font-medium transition-colors ${
                    tab === t.id
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {tab === "configure" ? (
              <AgentEditorForm
                key={activeAgent.id}
                agent={activeAgent}
                onSave={handleSave}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
            ) : null}

            {tab === "live" ? (
              <div className="space-y-3">
                <div className="space-y-0.5 border border-neutral-300 bg-neutral-50 px-4 py-3 text-xs text-neutral-500">
                  <p>
                    <span className="font-medium text-neutral-700">Voice:</span>{" "}
                    {activeAgent.voiceName}
                  </p>
                  <p>
                    <span className="font-medium text-neutral-700">Model:</span>{" "}
                    {activeAgent.ttsModel}
                  </p>
                </div>
                <VoiceAgent key={activeAgent.id} config={activeAgent} />
              </div>
            ) : null}

            {tab === "branches" ? (
              <BranchesTab
                agentId={activeAgent.id}
                onChanged={() => {
                  void load();
                }}
              />
            ) : null}

            {tab === "tests" ? (
              <TestsTab
                agentId={activeAgent.id}
                settings={activeAgent.settings}
                onUpdateSettings={handleUpdateSettings}
              />
            ) : null}

            {tab === "tools" ? (
              <ToolsTab
                agentId={activeAgent.id}
                settings={activeAgent.settings}
                onUpdateSettings={handleUpdateSettings}
              />
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center p-6 text-sm text-neutral-400">
          Select an agent from the sidebar
        </div>
      )}
    </div>
  );
}
