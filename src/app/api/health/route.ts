import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "ai-voice-receptionist",
    time: new Date().toISOString(),
  });
}
