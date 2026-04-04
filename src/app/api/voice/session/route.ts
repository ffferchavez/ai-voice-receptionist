/**
 * Session management for AI voice conversations.
 *
 * POST /api/voice/session        — create a new session
 * DELETE /api/voice/session?id=  — destroy a session
 * GET /api/voice/session?id=     — get session metadata
 */

import { NextResponse } from "next/server";
import { ConversationManager } from "@/lib/voice/conversation";

// POST — create session
export async function POST(request: Request) {
  let body: { systemPrompt?: string; metadata?: Record<string, unknown> } = {};
  try {
    body = await request.json();
  } catch {
    // body is optional
  }

  const mgr = ConversationManager.getInstance();
  const session = mgr.createSession({
    systemPrompt: body.systemPrompt,
    metadata: body.metadata,
  });

  return NextResponse.json({
    sessionId: session.id,
    createdAt: session.createdAt.toISOString(),
  });
}

// GET — retrieve session info
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id query param required" }, { status: 400 });
  }

  const mgr = ConversationManager.getInstance();
  const session = mgr.getSession(id);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({
    sessionId: session.id,
    turnCount: Math.floor(session.messages.length / 2),
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  });
}

// DELETE — destroy session
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id query param required" }, { status: 400 });
  }

  const mgr = ConversationManager.getInstance();
  mgr.deleteSession(id);

  return NextResponse.json({ ok: true });
}
