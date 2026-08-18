import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Work-queue list: role-scoped applications. */
export async function GET(req: NextRequest) {
  const personaId = req.nextUrl.searchParams.get("personaId");
  const role = req.nextUrl.searchParams.get("role");

  let where = {};
  if (role === "UNDERWRITER" && personaId) where = { underwriterId: personaId, status: { in: ["UW_REVIEW", "SENT_BACK", "ISSUED"] } };
  else if (role === "ANALYST" && personaId) where = { analystId: personaId, status: { in: ["ANALYST_REVIEW", "SENT_BACK", "UW_REVIEW"] } };
  else if (personaId) where = { ownerId: personaId };

  const apps = await db.application.findMany({ where, include: { customer: true }, orderBy: { stageChangedAt: "desc" } });
  return NextResponse.json({ applications: apps });
}
