"use client";

/**
 * AgentManager — full agent management UI.
 *
 * Features:
 *  - Create, duplicate, delete voice agents
 *  - Edit name, system prompt, ElevenLabs voice, TTS model
 *  - Live voice picker with preview playback
 *  - In-page test widget (VoiceAgent) without leaving the screen
 *  - Persists to localStorage (no backend needed until auth lands)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { VoiceAgent } from "./VoiceAgent";

// ── Types ──────────────────────────────────────────────────────────────────

export interface AgentConfig {
  id: string;
  name: string;
  systemPrompt: string;
  voiceId: string;
  voiceName: string;
  ttsModel: string;
  createdAt: string;
  updatedAt: string;
}

interface ElevenLabsVoice {
  voiceId: string;
  name: string;
  category: string;
  previewUrl: string | null;
}

// ── Constants ──────────────────────────────────────────────────────────────

const TTS_MODELS = [
  { id: "eleven_turbo_v2_5", label: "Turbo v2.5 — fastest, low latency" },
  { id: "eleven_flash_v2_5", label: "Flash v2.5 — ultra-fast" },
  { id: "eleven_multilingual_v2", label: "Multilingual v2 — best quality" },
  { id: "eleven_turbo_v2", label: "Turbo v2 — fast" },
];

const DEFAULT_SYSTEM_PROMPT = `You are a friendly and professional AI voice receptionist. Your job is to:
- Greet callers warmly and identify their needs
- Answer questions clearly and concisely
- Capture lead information (name, contact details, purpose) naturally
- Keep responses conversational and brief — you are speaking, not writing
- Avoid bullet points or long lists; use natural spoken sentences`;

const STORAGE_KEY = "helion-voice-agents";

// ── Storage helpers ───────────────────────────────────────────────────────

function loadAgents(): AgentConfig[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AgentConfig[]) : [];
  } catch {
    return [];
  }
}

function saveAgents(agents: AgentConfig[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
}

function createAgent(overrides: Partial<AgentConfig> = {}): AgentConfig {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: "New Agent",
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    voiceId: "21m00Tcm4TlvDq8ikWAM",
    voiceName: "Rachel",
    ttsModel: "eleven_turbo_v2_5",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ── Sub-components ────────────────────────────────────────────────────────

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
      className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors ${
        isActive
          ? "bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800"
          : "hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-transparent"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            isActive
              ? "bg-violet-600 text-white"
              : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
          }`}
        >
          {agent.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {agent.name}
          </p>
          <p className="truncate text-xs text-zinc-400">{agent.voiceName}</p>
        </div>
      </div>
    </button>
  );
}

// ── Voice picker ──────────────────────────────────────────────────────────

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/voice/voices")
      .then((r) => r.json())
      .then((data) => {
        setVoices(data.voices ?? []);
        setError(null);
      })
      .catch(() => setError("Could not load voices — check ELEVENLABS_API_KEY"))
      .finally(() => setLoading(false));
  }, []);

  const selected = voices.find((v) => v.voiceId === value);

  const playPreview = () => {
    const previewUrl = selected?.previewUrl;
    if (!previewUrl) return;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(previewUrl);
    audioRef.current = audio;
    setPreviewPlaying(true);
    audio.onended = () => setPreviewPlaying(false);
    audio.onerror = () => setPreviewPlaying(false);
    audio.play().catch(() => setPreviewPlaying(false));
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
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
            className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
          >
            {loading && <option>Loading voices…</option>}
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
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
          >
            {previewPlaying ? (
              <span className="h-3 w-3 rounded-sm bg-zinc-900 dark:bg-zinc-100" />
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-zinc-600 dark:text-zinc-300">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>
      )}
      {!loading && voices.length === 0 && !error && (
        <p className="text-xs text-zinc-400">No voices found.</p>
      )}
    </div>
  );
}

// ── Editor form ───────────────────────────────────────────────────────────

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

  // Reset draft when a different agent is selected
  useEffect(() => {
    setDraft(agent);
    setSaved(false);
  }, [agent.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    const updated = { ...draft, updatedAt: new Date().toISOString() };
    onSave(updated);
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
      {/* Name */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Agent Name
        </label>
        <input
          type="text"
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          placeholder="e.g. Sales Receptionist"
          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      {/* System prompt */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          System Prompt
        </label>
        <textarea
          value={draft.systemPrompt}
          onChange={(e) => setDraft((d) => ({ ...d, systemPrompt: e.target.value }))}
          rows={8}
          placeholder="Describe the agent's role, tone, and behavior…"
          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 resize-y font-mono"
        />
        <p className="text-xs text-zinc-400">
          Write in plain English. Tip: keep responses short since this is spoken audio.
        </p>
      </div>

      {/* Voice picker */}
      <VoicePicker
        value={draft.voiceId}
        valueName={draft.voiceName}
        onChange={(voiceId, voiceName) =>
          setDraft((d) => ({ ...d, voiceId, voiceName }))
        }
      />

      {/* TTS model */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          TTS Model
        </label>
        <select
          value={draft.ttsModel}
          onChange={(e) => setDraft((d) => ({ ...d, ttsModel: e.target.value }))}
          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500"
        >
          {TTS_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={!isDirty}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saved ? "✓ Saved" : "Save changes"}
        </button>
        <button
          onClick={onDuplicate}
          className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          Duplicate
        </button>
        <div className="flex-1" />
        <button
          onClick={() => {
            if (confirm(`Delete "${agent.name}"? This cannot be undone.`)) {
              onDelete();
            }
          }}
          className="rounded-lg border border-red-200 dark:border-red-900 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ── Main AgentManager component ───────────────────────────────────────────

export function AgentManager() {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tab, setTab] = useState<"configure" | "test">("configure");

  // Load from localStorage once on mount
  useEffect(() => {
    const stored = loadAgents();
    if (stored.length > 0) {
      setAgents(stored);
      setActiveId(stored[0].id);
    }
  }, []);

  // Persist whenever agents list changes
  useEffect(() => {
    saveAgents(agents);
  }, [agents]);

  const activeAgent = agents.find((a) => a.id === activeId) ?? null;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCreate = useCallback(() => {
    const a = createAgent();
    setAgents((prev) => [...prev, a]);
    setActiveId(a.id);
    setTab("configure");
  }, []);

  const handleDuplicate = useCallback(() => {
    if (!activeAgent) return;
    const clone = createAgent({
      name: `${activeAgent.name} (copy)`,
      systemPrompt: activeAgent.systemPrompt,
      voiceId: activeAgent.voiceId,
      voiceName: activeAgent.voiceName,
      ttsModel: activeAgent.ttsModel,
    });
    setAgents((prev) => {
      const idx = prev.findIndex((a) => a.id === activeAgent.id);
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      return next;
    });
    setActiveId(clone.id);
    setTab("configure");
  }, [activeAgent]);

  const handleSave = useCallback((updated: AgentConfig) => {
    setAgents((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  }, []);

  const handleDelete = useCallback(() => {
    if (!activeAgent) return;
    setAgents((prev) => {
      const next = prev.filter((a) => a.id !== activeAgent.id);
      if (next.length > 0) {
        const idx = prev.findIndex((a) => a.id === activeAgent.id);
        setActiveId(next[Math.min(idx, next.length - 1)].id);
      } else {
        setActiveId(null);
      }
      return next;
    });
  }, [activeAgent]);

  // ── Empty state ───────────────────────────────────────────────────────────

  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 dark:bg-violet-950">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8 text-violet-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
          </svg>
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">No agents yet</h2>
          <p className="mt-1 text-sm text-zinc-500">Create your first AI voice agent to get started.</p>
        </div>
        <button
          onClick={handleCreate}
          className="rounded-full bg-violet-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
        >
          + Create agent
        </button>
      </div>
    );
  }

  // ── Main layout ───────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-0 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden bg-white dark:bg-zinc-900 shadow-sm min-h-[600px]">
      {/* ── Sidebar ── */}
      <div className="border-b md:border-b-0 md:border-r border-zinc-200/80 dark:border-zinc-800/80 flex flex-col bg-zinc-50/60 dark:bg-zinc-950/40">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200/80 dark:border-zinc-800/80">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Agents
          </span>
          <button
            onClick={handleCreate}
            title="Create new agent"
            className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors text-lg leading-none"
          >
            +
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {agents.map((a) => (
            <AgentListItem
              key={a.id}
              agent={a}
              isActive={a.id === activeId}
              onClick={() => {
                setActiveId(a.id);
                setTab("configure");
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Main panel ── */}
      {activeAgent ? (
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800/80 px-6 py-3">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
              {activeAgent.name}
            </h2>
            {/* Tabs */}
            <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden text-sm">
              {(["configure", "test"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-1.5 font-medium transition-colors capitalize ${
                    tab === t
                      ? "bg-violet-600 text-white"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-6">
            {tab === "configure" ? (
              <AgentEditorForm
                agent={activeAgent}
                onSave={handleSave}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400 space-y-0.5">
                  <p>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">Voice:</span>{" "}
                    {activeAgent.voiceName}
                  </p>
                  <p>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">Model:</span>{" "}
                    {activeAgent.ttsModel}
                  </p>
                  <p className="italic">
                    Prompt: {activeAgent.systemPrompt.slice(0, 80)}…
                  </p>
                </div>
                {/* key=id forces fresh session when switching agents */}
                <VoiceAgent
                  key={activeAgent.id}
                  config={activeAgent}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center text-sm text-zinc-400 p-6">
          Select an agent from the sidebar
        </div>
      )}
    </div>
  );
}
