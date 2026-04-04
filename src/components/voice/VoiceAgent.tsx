"use client";

/**
 * VoiceAgent — browser component for the AI voice receptionist.
 *
 * Flow:
 *   1. Component mounts → creates a conversation session via POST /api/voice/session
 *   2. User presses "Hold to speak" → MediaRecorder captures microphone audio
 *   3. On release → audio blob sent to POST /api/voice/chat (multipart, audioResponse=true)
 *   4. Response audio (mp3) streamed into an <audio> element and played
 *   5. X-Reply-Text / X-Transcript headers surface the text for display
 *
 * Props:
 *   systemPrompt? — custom receptionist persona injected at session creation
 *   voiceId?      — ElevenLabs voice ID to use for TTS
 *   className?    — extra Tailwind classes for the wrapper div
 */

import { useEffect, useRef, useState, useCallback } from "react";

interface VoiceAgentProps {
  systemPrompt?: string;
  voiceId?: string;
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

export function VoiceAgent({ systemPrompt, voiceId, className = "" }: VoiceAgentProps) {
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sessionIdRef = useRef<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // ── Session bootstrap ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setStatus("initializing");

    (async () => {
      try {
        const res = await fetch("/api/voice/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ systemPrompt }),
        });
        if (!res.ok) throw new Error("Failed to create session");
        const data = await res.json();
        if (!cancelled) {
          sessionIdRef.current = data.sessionId;
          setStatus("ready");
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : "Session init failed");
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
      // Clean up session on unmount
      if (sessionIdRef.current) {
        fetch(`/api/voice/session?id=${sessionIdRef.current}`, {
          method: "DELETE",
        }).catch(() => {});
      }
    };
  }, [systemPrompt]);

  // Auto-scroll conversation to bottom
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  // ── Recording helpers ────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (status !== "ready") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(100); // 100ms timeslice
      recorderRef.current = recorder;
      setStatus("recording");
    } catch {
      setErrorMsg("Microphone access denied");
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

    const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
    chunksRef.current = [];

    await sendAudio(audioBlob);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Send audio to chat endpoint ──────────────────────────────────────────
  const sendAudio = async (audioBlob: Blob) => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;

    const form = new FormData();
    form.set("sessionId", sessionId);
    form.set("audio", audioBlob, "recording.webm");
    form.set("audioResponse", "true");
    if (voiceId) form.set("voiceId", voiceId);

    try {
      const res = await fetch("/api/voice/chat", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Chat request failed");
      }

      // Extract text from response headers
      const rawTranscript = res.headers.get("X-Transcript");
      const rawReply = res.headers.get("X-Reply-Text");
      const userText = rawTranscript ? decodeURIComponent(rawTranscript) : "(audio)";
      const replyText = rawReply ? decodeURIComponent(rawReply) : "";

      setTurns((prev) => [
        ...prev,
        { role: "user", text: userText },
        { role: "assistant", text: replyText },
      ]);

      // Play audio response
      const audioBuffer = await res.arrayBuffer();
      const blob = new Blob([audioBuffer], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);

      const audio = new Audio(url);
      audioRef.current = audio;
      setStatus("speaking");

      audio.onended = () => {
        URL.revokeObjectURL(url);
        setStatus("ready");
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        setStatus("ready");
      };

      await audio.play();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "An error occurred");
      setStatus("error");
    }
  };

  // ── Text input fallback ──────────────────────────────────────────────────
  const [textInput, setTextInput] = useState("");

  const sendText = async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId || !textInput.trim() || status !== "ready") return;

    const userText = textInput.trim();
    setTextInput("");
    setStatus("processing");

    try {
      const res = await fetch("/api/voice/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          text: userText,
          audioResponse: true,
          voiceId,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Chat request failed");
      }

      const rawReply = res.headers.get("X-Reply-Text");
      const replyText = rawReply ? decodeURIComponent(rawReply) : "";

      setTurns((prev) => [
        ...prev,
        { role: "user", text: userText },
        { role: "assistant", text: replyText },
      ]);

      const audioBuffer = await res.arrayBuffer();
      const blob = new Blob([audioBuffer], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);

      const audio = new Audio(url);
      audioRef.current = audio;
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

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Conversation transcript */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 min-h-40 max-h-96">
        {turns.length === 0 && (
          <p className="text-sm text-zinc-400 text-center mt-8">
            {status === "initializing" ? "Starting session…" : "Press and hold the mic button to speak"}
          </p>
        )}
        {turns.map((t, i) => (
          <div
            key={i}
            className={`mb-3 flex ${t.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                t.role === "user"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-sm"
              }`}
            >
              {t.text}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-4 py-2 text-sm text-red-700 dark:text-red-300">
          <span className="flex-1">{errorMsg}</span>
          <button onClick={resetError} className="shrink-0 font-medium hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Status indicator */}
      <div className="flex items-center justify-center gap-2 text-xs text-zinc-400">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            status === "ready" ? "bg-green-400" :
            status === "recording" ? "bg-red-500 animate-pulse" :
            status === "processing" ? "bg-yellow-400 animate-pulse" :
            status === "speaking" ? "bg-blue-400 animate-pulse" :
            status === "error" ? "bg-red-400" :
            "bg-zinc-300"
          }`}
        />
        {{
          idle: "Idle",
          initializing: "Starting…",
          ready: "Ready",
          recording: "Listening…",
          processing: "Thinking…",
          speaking: "Speaking…",
          error: "Error",
        }[status]}
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
          className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            status === "recording"
              ? "bg-red-500 scale-110 shadow-lg shadow-red-200 dark:shadow-red-900"
              : "bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          }`}
        >
          {/* Mic icon */}
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-6 w-6 text-white"
          >
            <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12V6a3.5 3.5 0 0 1 7 0v6a3.5 3.5 0 0 1-3.5 3.5Z" />
            <path d="M19 12a7 7 0 0 1-14 0H3a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12h-2Z" />
          </svg>
        </button>

        {/* Text input fallback */}
        <div className="flex flex-1 gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendText()}
            placeholder="Or type a message…"
            disabled={status !== "ready"}
            className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
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
    </div>
  );
}
