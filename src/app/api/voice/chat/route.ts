/**
 * POST /api/voice/chat
 *
 * Full voice agent turn: text-in → Claude Opus 4.6 → ElevenLabs TTS → audio-out.
 *
 * Accepts two modes:
 *
 * Mode A — JSON (text only, returns JSON with reply text + no audio):
 *   Content-Type: application/json
 *   { sessionId: string, text: string, audioResponse?: false }
 *
 * Mode B — JSON (text in, audio out):
 *   Content-Type: application/json
 *   { sessionId: string, text: string, audioResponse: true, voiceId?: string }
 *   → Response: audio/mpeg stream
 *
 * Mode C — multipart (audio in, audio out):
 *   Content-Type: multipart/form-data
 *   Fields: sessionId, audio (Blob), audioResponse? ("true"), voiceId?
 *   → STT → Claude → TTS → audio/mpeg stream
 *
 * In all modes the session must exist (create via POST /api/voice/session first).
 */

import { NextResponse } from "next/server";
import { ConversationManager } from "@/lib/voice/conversation";
import { ElevenLabsProvider } from "@/lib/voice/providers/elevenlabs";

export async function POST(request: Request) {
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!anthropicKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const contentType = request.headers.get("content-type") ?? "";

  // ── Parse request ──────────────────────────────────────────────────────────
  let sessionId: string;
  let userText: string;
  let wantAudio = false;
  let voiceId: string | undefined;

  if (contentType.startsWith("multipart/form-data")) {
    // Mode C: audio-in (STT first)
    if (!elevenLabsKey) {
      return NextResponse.json(
        { error: "ELEVENLABS_API_KEY is required for audio input" },
        { status: 500 }
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    sessionId = formData.get("sessionId") as string;
    const audioBlob = formData.get("audio");
    wantAudio = formData.get("audioResponse") === "true";
    voiceId = (formData.get("voiceId") as string) || undefined;

    if (!sessionId || !audioBlob || !(audioBlob instanceof Blob)) {
      return NextResponse.json(
        { error: "sessionId and audio (Blob) are required" },
        { status: 400 }
      );
    }

    try {
      const provider = new ElevenLabsProvider(elevenLabsKey);
      const sttResult = await provider.speechToText(audioBlob);
      userText = sttResult.text;
    } catch (err) {
      console.error("[Chat/STT] error:", err);
      return NextResponse.json(
        { error: "Speech transcription failed" },
        { status: 502 }
      );
    }
  } else {
    // Mode A / B: text-in
    let body: {
      sessionId?: string;
      text?: string;
      audioResponse?: boolean;
      voiceId?: string;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    sessionId = body.sessionId ?? "";
    userText = body.text ?? "";
    wantAudio = body.audioResponse === true;
    voiceId = body.voiceId;

    if (!sessionId || !userText.trim()) {
      return NextResponse.json(
        { error: "sessionId and text are required" },
        { status: 400 }
      );
    }
  }

  // ── Validate session ───────────────────────────────────────────────────────
  const mgr = ConversationManager.getInstance();
  if (!mgr.getSession(sessionId)) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // ── Claude turn ───────────────────────────────────────────────────────────
  let replyText: string;
  try {
    const result = await mgr.chat(sessionId, userText.trim());
    replyText = result.text;
  } catch (err) {
    console.error("[Chat/LLM] error:", err);
    return NextResponse.json(
      { error: "AI response generation failed" },
      { status: 502 }
    );
  }

  // ── Text-only response ────────────────────────────────────────────────────
  if (!wantAudio || !elevenLabsKey) {
    return NextResponse.json({
      reply: replyText,
      sessionId,
      transcript: userText,
    });
  }

  // ── TTS response ──────────────────────────────────────────────────────────
  try {
    const provider = new ElevenLabsProvider(elevenLabsKey);
    const audioStream = await provider.textToSpeech(replyText, { voiceId });

    return new Response(audioStream, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
        // Surface the text reply so the caller can display it
        "X-Reply-Text": encodeURIComponent(replyText),
        "X-Transcript": encodeURIComponent(userText),
      },
    });
  } catch (err) {
    console.error("[Chat/TTS] error:", err);
    // Fall back to text-only JSON if TTS fails
    return NextResponse.json(
      { reply: replyText, sessionId, transcript: userText, ttsError: true },
      { status: 200 }
    );
  }
}
