/**
 * GET /api/voice/voices
 *
 * Returns a curated list of ElevenLabs voices for use in the voice-picker UI.
 * Includes premade + cloned voices owned by the account.
 *
 * Response (JSON):
 *   { voices: Array<{ voiceId, name, category, previewUrl }> }
 */

import { NextResponse } from "next/server";
import { ElevenLabsProvider } from "@/lib/voice/providers/elevenlabs";

export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    const provider = new ElevenLabsProvider(apiKey);
    const res = await provider.listVoices();

    const voices = (res.voices ?? []).map((v) => ({
      voiceId: v.voiceId,
      name: v.name,
      category: v.category ?? "premade",
      previewUrl: v.previewUrl ?? null,
    }));

    return NextResponse.json({ voices });
  } catch (err) {
    console.error("[Voices] ElevenLabs error:", err);
    return NextResponse.json(
      { error: "Failed to fetch voices" },
      { status: 502 }
    );
  }
}
