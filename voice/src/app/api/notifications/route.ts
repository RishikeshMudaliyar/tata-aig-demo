import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const personaId = req.nextUrl.searchParams.get("personaId");
  if (!personaId) return NextResponse.json({ error: "personaId required" }, { status: 400 });
  const [items, unread] = await Promise.all([
    db.notification.findMany({ where: { personaId }, orderBy: { createdAt: "desc" }, take: 12 }),
    db.notification.count({ where: { personaId, readAt: null } }),
  ]);
  const clean = items.map((n) => {
    const m = /^\[NUDGE:([^\]]*)\]\s*([\s\S]*)$/.exec(n.text);
    return m ? { ...n, text: `Nudge from ${m[1]}: ${m[2]}` } : n;
  });
  return NextResponse.json({ items: clean, unread });
}

export async function POST(req: NextRequest) {
  const { personaId, id } = await req.json();
  if (id) await db.notification.update({ where: { id }, data: { readAt: new Date() } });
  else if (personaId) await db.notification.updateMany({ where: { personaId, readAt: null }, data: { readAt: new Date() } });
  return NextResponse.json({ ok: true });
}
