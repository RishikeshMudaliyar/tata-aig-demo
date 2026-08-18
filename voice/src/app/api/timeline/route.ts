import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const targetId = req.nextUrl.searchParams.get("targetId");
  const events = await db.activityEvent.findMany({
    where: targetId ? { targetId } : {},
    include: { actor: { select: { name: true, role: true, initials: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json({ events });
}
