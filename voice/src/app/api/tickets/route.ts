import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { ticketId, actorId } = await req.json();
  const t = await db.servicingTicket.findUnique({ where: { id: ticketId }, include: { customer: true } });
  if (!t) return NextResponse.json({ error: "not found" }, { status: 404 });
  await db.servicingTicket.update({ where: { id: ticketId }, data: { status: "RESOLVED" } });
  await db.activityEvent.create({ data: { actorId: actorId ?? null, verb: "resolved service ticket", targetType: "ServicingTicket", targetId: ticketId, note: `${t.type.replace(/_/g, " ").toLowerCase()} · ${t.customer.name}` } });
  return NextResponse.json({ ok: true });
}
