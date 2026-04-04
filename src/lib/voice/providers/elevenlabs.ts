/**
 * ElevenLabs voice provider — wraps TTS (streaming) and STT (Scribe) APIs.
 *
 * Usage:
 *   const provider = new ElevenLabsProvider(process.env.ELEVENLABS_API_KEY!);
 *   const audioStream = await provider.textToSpeech("Hello world");
 *   const transcript  = await provider.speechToText(audioBlob);
 */

import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export interface TTSOptions {
  /** ElevenLabs voice ID. Defaults to Rachel (21m00Tcm4TlvDq8ikWAM). */
  voiceId?: string;
  /** ElevenLabs model. Defaults to eleven_turbo_v2_5 for lowest latency. */
  modelId?: string;
  /** Audio output format sent back to the browser. */
  outputFormat?: string;
  /**
   * Latency optimisation level 0–4.
   * 0 = quality, 4 = max speed. Defaults to 3.
   */
  optimizeStreamingLatency?: number;
}

export interface STTOptions {
  /** ISO-639-1 language hint, e.g. "en". Auto-detected when omitted. */
  languageCode?: string;
}

export interface TranscriptResult {
  text: string;
  languageCode: string;
  languageProbability: number;
}

// Well-known voices you can pass to voiceId
export const ELEVENLABS_VOICES = {
  rachel: "21m00Tcm4TlvDq8ikWAM",
  adam: "pNInz6obpgDQGcFmaJgB",
  domi: "AZnzlk1XvdvUeBnXmlld",
  elli: "MF3mGyEYCl7XYWbV9V6O",
  josh: "TxGEqnHWrfWFTfGW9XjX",
  arnold: "VR6AewLTigWG4xSOukaG",
  bella: "EXAVITQu4vr4xnSDxMaL",
  callum: "N2lVS1w4EtoT3dr4eOWO",
} as const;

export class ElevenLabsProvider {
  private readonly client: ElevenLabsClient;

  constructor(apiKey: string) {
    this.client = new ElevenLabsClient({ apiKey });
  }

  /**
   * Convert text to speech and return a Web ReadableStream of audio bytes.
   * Pipe directly into a Response to stream audio to the browser.
   */
  async textToSpeech(
    text: string,
    options: TTSOptions = {}
  ): Promise<ReadableStream<Uint8Array>> {
    const {
      voiceId = ELEVENLABS_VOICES.rachel,
      modelId = "eleven_turbo_v2_5",
      outputFormat = "mp3_22050_32",
      optimizeStreamingLatency = 3,
    } = options;

    const response = await this.client.textToSpeech.stream(voiceId, {
      text,
      modelId,
      outputFormat: outputFormat as Parameters<
        typeof this.client.textToSpeech.stream
      >[1]["outputFormat"],
      optimizeStreamingLatency,
    });

    return response;
  }

  /**
   * Transcribe audio using ElevenLabs Scribe (STT).
   * Accepts any Blob/File — webm, mp4, wav, ogg etc.
   */
  async speechToText(
    audio: Blob | File,
    options: STTOptions = {}
  ): Promise<TranscriptResult> {
    const file = audio instanceof File ? audio : new File([audio], "audio.webm", { type: audio.type });

    const response = await this.client.speechToText.convert({
      file,
      modelId: "scribe_v1",
      ...(options.languageCode ? { languageCode: options.languageCode } : {}),
    });

    // response is SpeechToTextChunkResponseModel | MultichannelSpeechToTextResponseModel | SpeechToTextWebhookResponseModel
    // All share a top-level `text` field; channel-model may not have languageCode
    const r = response as {
      text: string;
      languageCode?: string;
      languageProbability?: number;
    };

    return {
      text: r.text ?? "",
      languageCode: r.languageCode ?? "und",
      languageProbability: r.languageProbability ?? 1,
    };
  }

  /** List available voices (useful for voice-picker UI). */
  async listVoices() {
    return this.client.voices.getAll();
  }
}
