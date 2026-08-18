import { NextResponse } from "next/server";
import { startWebCall, gatewayKeyConfigured, type AgentKind } from "@/lib/nurix";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { agent, variables } = (await req.json().catch(() => ({}))) as {
    agent?: AgentKind;
    variables?: Record<string, string>;
  };

  if (!gatewayKeyConfigured()) {
    return NextResponse.json(
      { ok: false, reason: "GATEWAY_KEY_MISSING", message: "NURIX_GATEWAY_API_KEY is not set on the server." },
      { status: 503 },
    );
  }

  const { status, body, userId } = await startWebCall(agent ?? "COACH", variables ?? {});

  if (status === 0) {
    return NextResponse.json(
      { ok: false, reason: "UNREACHABLE", message: "Could not reach the voice gateway from the server. Use the browser-direct call path instead — see VoiceAgent.tsx.", upstream: body },
      { status: 502 },
    );
  }
  if (status >= 400) {
    return NextResponse.json({ ok: false, reason: "UPSTREAM", status, upstream: body }, { status: 502 });
  }
  // A queued call comes back 200 but without a room — surface that rather than failing opaquely.
  if (!body.serverUrl || !body.participantToken) {
    return NextResponse.json({ ok: false, reason: "QUEUED", upstream: body }, { status: 202 });
  }
  return NextResponse.json({ ok: true, userId, ...body });
}
