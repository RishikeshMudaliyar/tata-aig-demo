import { NextRequest, NextResponse } from "next/server";
import { composeCockpit } from "@/lib/orchestration/composer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const personaId = req.nextUrl.searchParams.get("personaId");
  if (!personaId) return NextResponse.json({ error: "personaId required" }, { status: 400 });
  const data = await composeCockpit(personaId);
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(data);
}
