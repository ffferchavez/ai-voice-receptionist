/**
 * POST /api/voice/tts
 *
 * Convert text to speech using ElevenLabs and stream the audio back.
 *
 * Request body (JSON):
 *   { text: string, voiceId?: string, modelId?: string }
 *
 * Response: audio/mpeg stream
 */

import { NextResponse } from "next/server";
import { ElevenLabsProvider } from "@/lib/voice/providers/elevenlabs";

export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY is not configured" },
      { status: 500 }
    );
  }

  let body: { text?: string; voiceId?: string; modelId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { text, voiceId, modelId } = body;
  if (!text || typeof text !== "string" || text.trim() === "") {
    return NextResponse.json(
      { error: "text is required and must be a non-empty string" },
      { status: 400 }
    );
  }

  try {
    const provider = new ElevenLabsProvider(apiKey);
    const audioStream = await provider.textToSpeech(text.trim(), {
      voiceId,
      modelId,
    });

    return new Response(audioStream, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("[TTS] ElevenLabs error:", err);
    return NextResponse.json(
      { error: "Text-to-speech conversion failed" },
      { status: 502 }
    );
  }
}
