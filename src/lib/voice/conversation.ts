/**
 * Conversation manager — drives the AI brain using Claude Opus 4.6.
 *
 * Each session has its own message history so multi-turn context is preserved
 * across calls.  Sessions are kept in memory; persist to DB (call_sessions /
 * call_events) at webhook ingestion time for durability.
 *
 * Usage:
 *   const mgr = ConversationManager.getInstance();
 *   const session = mgr.createSession({ systemPrompt: "You are a receptionist…" });
 *   const reply = await mgr.chat(session.id, "I'd like to book a table");
 */

import Anthropic from "@anthropic-ai/sdk";

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
  messages: Anthropic.MessageParam[];
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
  private readonly anthropic: Anthropic;

  private constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
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
   * Uses Claude Opus 4.6 with adaptive thinking for nuanced responses.
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

    // Use streaming so long responses don't time out
    const stream = this.anthropic.messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 64000,
      thinking: { type: "adaptive" },
      system: systemPrompt,
      messages: session.messages,
    });

    const message = await stream.finalMessage();

    // Extract the text reply (skip thinking blocks — those are internal)
    const textBlock = message.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text"
    );
    const replyText = textBlock?.text ?? "";

    // Persist assistant turn to history
    session.messages.push({ role: "assistant", content: message.content });
    session.updatedAt = new Date();

    return {
      text: replyText,
      sessionId,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
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
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.messages.push({ role: "user", content: userText });

    const systemPrompt =
      session.config.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;

    const stream = this.anthropic.messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 64000,
      thinking: { type: "adaptive" },
      system: systemPrompt,
      messages: session.messages,
    });

    let accumulated = "";

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        accumulated += event.delta.text;
        yield event.delta.text;
      }
    }

    const final = await stream.finalMessage();

    // Persist the full assistant message (includes thinking blocks) to history
    session.messages.push({ role: "assistant", content: final.content });
    session.updatedAt = new Date();

    return {
      text: accumulated,
      sessionId,
      inputTokens: final.usage.input_tokens,
      outputTokens: final.usage.output_tokens,
    };
  }
}
