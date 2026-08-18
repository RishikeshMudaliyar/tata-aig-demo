import { NextResponse } from "next/server";
import { callTranscript } from "@/lib/nurix";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const callId = u.searchParams.get("callId");
  const userId = u.searchParams.get("userId") ?? "";
  if (!callId) return NextResponse.json({ ok: false, error: "callId required" }, { status: 400 });
  const { status, body } = await callTranscript(callId, userId);
  return NextResponse.json({ ok: status === 200, ...body }, { status: status === 200 ? 200 : 502 });
}
