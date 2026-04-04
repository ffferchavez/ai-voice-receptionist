/**
 * Provider-agnostic shapes used after normalization.
 * Keep provider-specific payloads in lib/voice/providers/* and map here.
 */

export type VoiceProviderId = "vapi" | "twilio" | "elevenlabs" | "simulated" | "unknown";

export type NormalizedCallEventType =
  | "call.started"
  | "call.ended"
  | "transcript.partial"
  | "transcript.final"
  | "tool.call"
  | "provider.unknown";

export interface NormalizedCallEvent {
  type: NormalizedCallEventType;
  occurredAt: string;
  externalCallId: string | null;
  transcriptChunk?: string;
  metadata?: Record<string, unknown>;
}
