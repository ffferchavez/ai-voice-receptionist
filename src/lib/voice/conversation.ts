/**
 * Conversation manager — drives the AI brain using Gemini 2.5 Flash.
 *
 * Each session has its own message history so multi-turn context is preserved
 * across calls. Sessions are kept in memory; persist to DB (call_sessions /
 * call_events) at webhook ingestion time for durability.
 *
 * Usage:
 *   const mgr = ConversationManager.getInstance();
 *   const session = mgr.createSession({ systemPrompt: "You are a receptionist…" });
 *   const reply = await mgr.chat(session.id, "I'd like to book a table");
 */

import { GoogleGenAI } from "@google/genai";

export interface SessionConfig {
  /** Custom system prompt for this receptionist instance. */
  systemPrompt?: string;
  /** Arbitrary metadata stored alongside the session. */
  metadata?: Record<string, unknown>;
}

export interface ConversationSession {
  id: string;
  config: SessionConfig;
  /** Full message history sent to the API on every turn. */
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatResult {
  text: string;
  sessionId: string;
  /** Number of input tokens charged (useful for metering). */
  inputTokens: number;
  outputTokens: number;
}

const DEFAULT_SYSTEM_PROMPT = `You are a friendly and professional AI voice receptionist. Your job is to:
- Greet callers warmly and identify their needs
- Answer questions about the business clearly and concisely
- Capture lead information (name, contact details, purpose of call) naturally
- Schedule appointments or take messages when appropriate
- Keep responses conversational and brief — you are speaking, not writing
- Avoid bullet points, markdown, or long lists; use natural spoken sentences

Always be polite, patient, and helpful. If you cannot help with something, offer to take a message or transfer the call.`;

/** Singleton that owns all in-memory sessions. */
export class ConversationManager {
  private static instance: ConversationManager;
  private readonly sessions = new Map<string, ConversationSession>();
  private readonly gemini: GoogleGenAI;

  private constructor() {
    this.gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  static getInstance(): ConversationManager {
    if (!ConversationManager.instance) {
      ConversationManager.instance = new ConversationManager();
    }
    return ConversationManager.instance;
  }

  /** Create a new conversation session and return its ID. */
  createSession(config: SessionConfig = {}): ConversationSession {
    const id = crypto.randomUUID();
    const session: ConversationSession = {
      id,
      config,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.sessions.set(id, session);
    return session;
  }

  getSession(id: string): ConversationSession | undefined {
    return this.sessions.get(id);
  }

  deleteSession(id: string): void {
    this.sessions.delete(id);
  }

  /**
   * Send a user message and get the assistant's reply.
   * Uses Gemini 2.5 Flash for low-latency receptionist responses.
   */
  async chat(sessionId: string, userText: string): Promise<ChatResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Append the new user turn
    session.messages.push({ role: "user", content: userText });

    const systemPrompt =
      session.config.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;

    const response = await this.gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: session.messages.map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      })),
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 1024,
      },
    });
    const replyText = response.text ?? "";

    // Persist assistant turn to history
    session.messages.push({ role: "assistant", content: replyText });
    session.updatedAt = new Date();

    return {
      text: replyText,
      sessionId,
      inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
    };
  }

  /**
   * Like chat() but streams the text reply token-by-token via an async generator.
   * Caller is responsible for collecting the full text for history.
   */
  async *chatStream(
    sessionId: string,
    userText: string
  ): AsyncGenerator<string, ChatResult, unknown> {
    const result = await this.chat(sessionId, userText);
    if (result.text) {
      yield result.text;
    }
    return result;
  }
}
