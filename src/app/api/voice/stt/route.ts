/**
 * POST /api/voice/stt
 *
 * Transcribe audio using ElevenLabs Scribe (STT).
 *
 * Request body: multipart/form-data
 *   audio: Blob  (webm, mp4, wav, ogg, …)
 *   languageCode?: string  (ISO-639-1 hint, e.g. "en")
 *
 * Response (JSON):
 *   { transcript: string, languageCode: string, languageProbability: number }
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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 }
    );
  }

  const audioEntry = formData.get("audio");
  if (!audioEntry || !(audioEntry instanceof Blob)) {
    return NextResponse.json(
      { error: "audio field (Blob) is required" },
      { status: 400 }
    );
  }

  const languageCode =
    typeof formData.get("languageCode") === "string"
      ? (formData.get("languageCode") as string)
      : undefined;

  try {
    const provider = new ElevenLabsProvider(apiKey);
    const result = await provider.speechToText(audioEntry, { languageCode });

    return NextResponse.json({
      transcript: result.text,
      languageCode: result.languageCode,
      languageProbability: result.languageProbability,
    });
  } catch (err) {
    console.error("[STT] ElevenLabs error:", err);
    return NextResponse.json(
      { error: "Speech-to-text transcription failed" },
      { status: 502 }
    );
  }
}
