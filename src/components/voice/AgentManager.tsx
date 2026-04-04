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
      className={`w-full border px-3 py-3 text-left transition-colors ${
        isActive
          ? "border border-neutral-300 bg-white"
          : "hover:bg-neutral-100 border border-transparent"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center text-xs font-semibold ${
            isActive
              ? "bg-neutral-900 text-white"
              : "bg-neutral-200 text-neutral-600"
          }`}
        >
          {agent.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-neutral-900">
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
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
      <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wide">
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
            className="helion-input flex-1 disabled:opacity-50"
          >
            {loading && <option value={value}>{valueName} (loading…)</option>}
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
            className="helion-btn-soft h-9 w-9 p-0 disabled:opacity-40"
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
      {!loading && voices.length === 0 && !error && (
        <p className="text-xs text-neutral-400">No voices found.</p>
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
        <label className="block text-[10px] font-medium uppercase tracking-[0.22em] text-neutral-400">
          1. Identity
        </label>
        <p className="text-sm font-medium text-neutral-900">Agent name</p>
        <input
          type="text"
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          placeholder="e.g. Sales Receptionist"
          className="helion-input"
        />
      </div>

      {/* System prompt */}
      <div className="space-y-1.5 border-t border-neutral-200 pt-5">
        <label className="block text-[10px] font-medium uppercase tracking-[0.22em] text-neutral-400">
          2. Instructions
        </label>
        <p className="text-sm font-medium text-neutral-900">System prompt</p>
        <textarea
          value={draft.systemPrompt}
          onChange={(e) => setDraft((d) => ({ ...d, systemPrompt: e.target.value }))}
          rows={8}
          placeholder="Describe the agent's role, tone, and behavior…"
          className="helion-input resize-y font-mono"
        />
        <p className="text-xs text-zinc-400">
          Keep responses concise and spoken-friendly for live calls.
        </p>
      </div>

      {/* Voice picker */}
      <div className="border-t border-neutral-200 pt-5">
        <label className="mb-2 block text-[10px] font-medium uppercase tracking-[0.22em] text-neutral-400">
          3. Voice
        </label>
        <VoicePicker
          value={draft.voiceId}
          valueName={draft.voiceName}
          onChange={(voiceId, voiceName) =>
            setDraft((d) => ({ ...d, voiceId, voiceName }))
          }
        />
      </div>

      {/* TTS model */}
      <div className="space-y-1.5 border-t border-neutral-200 pt-5">
        <label className="block text-[10px] font-medium uppercase tracking-[0.22em] text-neutral-400">
          4. Speech model
        </label>
        <p className="text-sm font-medium text-neutral-900">TTS model</p>
        <select
          value={draft.ttsModel}
          onChange={(e) => setDraft((d) => ({ ...d, ttsModel: e.target.value }))}
          className="helion-input"
        >
          {TTS_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2 border-t border-neutral-200 pt-5">
        <button
          onClick={handleSave}
          disabled={!isDirty}
          className="helion-btn-dark"
        >
          {saved ? "Saved" : "Save changes"}
        </button>
        <button
          onClick={onDuplicate}
          className="helion-btn-soft"
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
          className="helion-btn-soft border-red-200 text-red-700 hover:bg-red-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ── Main AgentManager component ───────────────────────────────────────────

export function AgentManager() {
  // Lazy initializer reads localStorage synchronously — agents is never []
  // on the initial render, which prevents the persist effect from wiping data.
  const [agents, setAgents] = useState<AgentConfig[]>(() => loadAgents());
  const [activeId, setActiveId] = useState<string | null>(
    () => loadAgents()[0]?.id ?? null
  );
  const [tab, setTab] = useState<"configure" | "test">("configure");

  // Skip the very first effect run (data just came from localStorage).
  // Every subsequent change triggers a save.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
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
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="flex h-16 w-16 items-center justify-center bg-neutral-100">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8 text-neutral-700">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
          </svg>
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-neutral-900">No agents yet</h2>
          <p className="mt-1 text-sm text-zinc-500">Create your first AI voice agent to get started.</p>
        </div>
        <button
          onClick={handleCreate}
          className="helion-btn-dark"
        >
          + Create agent
        </button>
      </div>
    );
  }

  // ── Main layout ───────────────────────────────────────────────────────────

  return (
    <div className="grid min-h-[640px] grid-cols-1 gap-0 overflow-hidden border border-neutral-300 bg-white md:grid-cols-[260px_1fr]">
      {/* ── Sidebar ── */}
      <div className="flex flex-col border-b border-neutral-300 bg-neutral-50/70 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between border-b border-neutral-300 px-4 py-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
            Agent profiles
          </span>
          <button
            onClick={handleCreate}
            title="Create new agent"
            className="helion-btn-soft h-7 w-7 p-0 text-lg leading-none"
          >
            +
          </button>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto p-2">
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
          <div className="flex items-center justify-between border-b border-neutral-300 px-6 py-4">
            <div>
              <p className="helion-kicker">Configuration</p>
              <h2 className="mt-1 text-lg font-semibold text-neutral-900">
                {activeAgent.name}
              </h2>
            </div>
            {/* Tabs */}
            <div className="flex overflow-hidden border border-neutral-300 text-[12px]">
              {(["configure", "test"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-1.5 font-medium transition-colors capitalize ${
                    tab === t
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-600 hover:bg-neutral-100"
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
                key={activeAgent.id}
                agent={activeAgent}
                onSave={handleSave}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
            ) : (
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
        <div className="flex items-center justify-center p-6 text-sm text-neutral-400">
          Select an agent from the sidebar
        </div>
      )}
    </div>
  );
}
