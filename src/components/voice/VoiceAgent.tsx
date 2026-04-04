"use client";

/**
 * VoiceAgent — browser widget for a single AI voice receptionist.
 *
 * Accepts an AgentConfig object so the parent can control all settings.
 * Mount with `key={config.id}` to get a fresh session when switching agents.
 *
 * Flow:
 *  1. Mount → POST /api/voice/session (with config.systemPrompt)
 *  2. Hold mic → MediaRecorder captures audio → POST /api/voice/chat (audio)
 *  3. Response mp3 is streamed back and auto-played
 *  4. Text fallback also available for quick testing
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentConfig } from "./AgentManager";

interface VoiceAgentProps {
  config: AgentConfig;
  className?: string;
}

interface Turn {
  role: "user" | "assistant";
  text: string;
}

type AgentStatus =
  | "idle"
  | "initializing"
  | "ready"
  | "recording"
  | "processing"
  | "speaking"
  | "error";

export function VoiceAgent({ config, className = "" }: VoiceAgentProps) {
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");

  const sessionIdRef = useRef<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // ── Create / reset session ────────────────────────────────────────────────
  const initSession = useCallback(async () => {
    setStatus("initializing");
    setTurns([]);
    setErrorMsg(null);

    // Destroy old session if any
    if (sessionIdRef.current) {
      fetch(`/api/voice/session?id=${sessionIdRef.current}`, { method: "DELETE" }).catch(
        () => {}
      );
      sessionIdRef.current = null;
    }

    try {
      const res = await fetch("/api/voice/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt: config.systemPrompt }),
      });
      if (!res.ok) throw new Error("Failed to create session");
      const data = await res.json();
      sessionIdRef.current = data.sessionId;
      setStatus("ready");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Session init failed");
      setStatus("error");
    }
  }, [config.systemPrompt]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/voice/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemPrompt: config.systemPrompt }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          sessionIdRef.current = data.sessionId;
          setStatus("ready");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMsg(err.message ?? "Session init failed");
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
      if (sessionIdRef.current) {
        fetch(`/api/voice/session?id=${sessionIdRef.current}`, {
          method: "DELETE",
        }).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount/unmount; use initSession() to manually reset

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  // ── Recording helpers ─────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (status !== "ready") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(100);
      recorderRef.current = recorder;
      setStatus("recording");
    } catch {
      setErrorMsg("Microphone access denied — check browser permissions");
      setStatus("error");
    }
  }, [status]);

  const stopRecording = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    recorder.stop();
    recorder.stream.getTracks().forEach((t) => t.stop());
    recorderRef.current = null;
    setStatus("processing");

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    chunksRef.current = [];
    await sendAudio(blob);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Send audio turn ───────────────────────────────────────────────────────
  const sendAudio = async (audioBlob: Blob) => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;

    const form = new FormData();
    form.set("sessionId", sessionId);
    form.set("audio", audioBlob, "recording.webm");
    form.set("audioResponse", "true");
    if (config.voiceId) form.set("voiceId", config.voiceId);

    await submitChatRequest(form, "multipart");
  };

  // ── Send text turn ────────────────────────────────────────────────────────
  const sendText = async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId || !textInput.trim() || status !== "ready") return;

    const userText = textInput.trim();
    setTextInput("");
    setStatus("processing");

    await submitChatRequest(
      { sessionId, text: userText, audioResponse: true, voiceId: config.voiceId },
      "json"
    );
  };

  // ── Shared chat request handler ───────────────────────────────────────────
  const submitChatRequest = async (
    payload: FormData | Record<string, unknown>,
    mode: "multipart" | "json"
  ) => {
    try {
      const init: RequestInit =
        mode === "multipart"
          ? { method: "POST", body: payload as FormData }
          : {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            };

      const res = await fetch("/api/voice/chat", init);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Chat failed");
      }

      // The server returns JSON (text-only fallback) when TTS is unavailable.
      // Check Content-Type before attempting to decode as audio.
      const contentType = res.headers.get("Content-Type") ?? "";
      if (contentType.startsWith("application/json")) {
        const data = await res.json() as { reply?: string; transcript?: string };
        setTurns((prev) => [
          ...prev,
          { role: "user", text: data.transcript ?? "(audio)" },
          { role: "assistant", text: data.reply ?? "" },
        ]);
        setStatus("ready");
        return;
      }

      // Audio response path
      const rawTranscript = res.headers.get("X-Transcript");
      const rawReply = res.headers.get("X-Reply-Text");
      const userText = rawTranscript ? decodeURIComponent(rawTranscript) : "(audio)";
      const replyText = rawReply ? decodeURIComponent(rawReply) : "";

      setTurns((prev) => [
        ...prev,
        { role: "user", text: userText },
        { role: "assistant", text: replyText },
      ]);

      const audioBuffer = await res.arrayBuffer();
      const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });
      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);
      setStatus("speaking");
      audio.onended = () => { URL.revokeObjectURL(url); setStatus("ready"); };
      audio.onerror = () => { URL.revokeObjectURL(url); setStatus("ready"); };
      await audio.play();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "An error occurred");
      setStatus("error");
    }
  };

  const resetError = () => {
    setErrorMsg(null);
    setStatus("ready");
  };

  // ── Status pill helpers ───────────────────────────────────────────────────
  const statusDotColor = {
    idle: "bg-zinc-300",
    initializing: "bg-zinc-300 animate-pulse",
    ready: "bg-green-400",
    recording: "bg-red-500 animate-pulse",
    processing: "bg-yellow-400 animate-pulse",
    speaking: "bg-blue-400 animate-pulse",
    error: "bg-red-400",
  }[status];

  const statusLabel = {
    idle: "Idle",
    initializing: "Starting…",
    ready: "Ready",
    recording: "Listening…",
    processing: "Thinking…",
    speaking: "Speaking…",
    error: "Error",
  }[status];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Transcript window */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 min-h-48 max-h-80">
        {turns.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center mt-10">
            {status === "initializing"
              ? "Starting session…"
              : "Hold the mic button to speak, or type below"}
          </p>
        ) : (
          turns.map((t, i) => (
            <div
              key={i}
              className={`mb-3 flex ${t.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                  t.role === "user"
                    ? "bg-violet-600 text-white rounded-br-sm"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-sm"
                }`}
              >
                {t.text}
              </div>
            </div>
          ))
        )}
        <div ref={scrollRef} />
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-4 py-2 text-sm text-red-700 dark:text-red-300">
          <span className="flex-1">{errorMsg}</span>
          <button onClick={resetError} className="font-medium hover:underline shrink-0">
            Dismiss
          </button>
        </div>
      )}

      {/* Status + reset row */}
      <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
        <span className="flex items-center gap-1.5">
          <span className={`inline-block h-2 w-2 rounded-full ${statusDotColor}`} />
          {statusLabel}
        </span>
        <button
          onClick={initSession}
          disabled={status === "initializing" || status === "recording"}
          className="hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-40 transition-colors"
          title="Start a fresh conversation"
        >
          ↺ Reset session
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Mic button */}
        <button
          onPointerDown={startRecording}
          onPointerUp={stopRecording}
          onPointerLeave={stopRecording}
          disabled={status !== "ready" && status !== "recording"}
          aria-label="Hold to speak"
          className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
            status === "recording"
              ? "bg-red-500 scale-110 shadow-lg"
              : "bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-white">
            <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12V6a3.5 3.5 0 0 1 7 0v6a3.5 3.5 0 0 1-3.5 3.5Z" />
            <path d="M19 12a7 7 0 0 1-14 0H3a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12h-2Z" />
          </svg>
        </button>

        {/* Text input fallback */}
        <input
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendText()}
          placeholder="Or type a message…"
          disabled={status !== "ready"}
          className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-40"
        />
        <button
          onClick={sendText}
          disabled={status !== "ready" || !textInput.trim()}
          className="rounded-xl bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
