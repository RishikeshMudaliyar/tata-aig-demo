import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseJSON } from "@/lib/domain";
import { newDocs } from "@/lib/orchestration/journey";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const lead = await db.lead.findUnique({ where: { id }, include: { owner: { select: { name: true } } } });
    if (!lead) return NextResponse.json({ error: "not found" }, { status: 404 });
    // if already converted, hand back the application id so the UI can jump to the case
    const app = lead.status === "CONVERTED" ? await db.application.findFirst({ where: { leadId: lead.id } }) : null;
    return NextResponse.json({ lead: { ...lead, copilotParsed: parseJSON(lead.copilot, {}) }, applicationId: app?.id ?? null });
  }
  const leads = await db.lead.findMany({ include: { owner: { select: { name: true } } }, orderBy: { score: "desc" } });
  return NextResponse.json({ leads });
}

export async function POST(req: NextRequest) {
  const { leadId, action, actorId, note } = await req.json();
  const lead = await db.lead.findUnique({ where: { id: leadId } });
  if (!lead) return NextResponse.json({ error: "not found" }, { status: 404 });

  // --- outcome: customer agreed → convert into an application (doc collection) ---
  if (action === "interested") {
    const copilot = parseJSON<{ product?: string; cover?: number; premium?: number }>(lead.copilot, {});
    const customer = await db.customer.create({
      data: {
        name: lead.name, phone: lead.phone, language: lead.language ?? "Hindi", city: lead.city,
        occupation: lead.occupation, incomeAnnual: lead.incomeAnnual,
        panName: lead.name, aadhaarName: lead.name, segment: "New business",
      },
    });
    const refNo = `APP-2026-${String(4600 + (Math.abs(hash(lead.id)) % 300))}`;
    const analyst = await db.persona.findFirst({ where: { role: "ANALYST" } });
    const uw = await db.persona.findFirst({ where: { role: "UNDERWRITER" } });
    const product = copilot.product ?? `Bajaj Allianz Life Smart Protect Goal`;
    const app = await db.application.create({
      data: {
        refNo, customerId: customer.id, leadId: lead.id,
        product: product.replace(/\s*\(.*\)$/, ""), plan: lead.productInterest.toLowerCase().includes("term") ? "Term" : "ULIP",
        sumAssured: copilot.cover ?? 1_00_00_000, premium: copilot.premium ?? 15000,
        status: "DOC_COLLECTION", ownerId: lead.ownerId, analystId: analyst?.id ?? null, underwriterId: uw?.id ?? null,
        docs: JSON.stringify(newDocs()),
      },
    });
    await db.lead.update({ where: { id: leadId }, data: { status: "CONVERTED", customerId: customer.id } });
    await db.activityEvent.create({ data: { actorId: actorId ?? null, verb: "converted lead & opened application", targetType: "Application", targetId: app.id, note: `${lead.name} · quote accepted` } });
    return NextResponse.json({ ok: true, applicationId: app.id, next: { stage: "DOC_COLLECTION", message: "Application opened — document collection started. Customer can upload from their phone; you can also collect manually." } });
  }

  if (action === "callback") {
    await db.lead.update({ where: { id: leadId }, data: { status: "CALLBACK" } });
    await db.activityEvent.create({ data: { actorId: actorId ?? null, verb: "scheduled a callback", targetType: "Lead", targetId: leadId, note: lead.name } });
    return NextResponse.json({ ok: true, next: { message: "Callback scheduled — stays in your queue." } });
  }

  if (action === "not_interested") {
    await db.lead.update({ where: { id: leadId }, data: { status: "CLOSED", closedReason: note ?? "Not interested" } });
    await db.activityEvent.create({ data: { actorId: actorId ?? null, verb: "closed lead — not interested", targetType: "Lead", targetId: leadId, note: lead.name } });
    return NextResponse.json({ ok: true, next: { message: "Lead closed." } });
  }

  if (action === "nudge") {
    await db.activityEvent.create({ data: { actorId: actorId ?? null, verb: "nudged", targetType: "Lead", targetId: leadId, note: `follow-up on ${lead.name}` } });
    return NextResponse.json({ ok: true });
  }

  // demo: reset a converted lead back to NEW (removes the created customer + application)
  if (action === "resetJourney") {
    const app = await db.application.findFirst({ where: { leadId: lead.id } });
    if (app) {
      await db.activityEvent.deleteMany({ where: { targetType: "Application", targetId: app.id } });
      await db.notification.deleteMany({ where: { href: `/case?id=${app.id}` } });
      await db.policy.deleteMany({ where: { customerId: app.customerId, issueDate: new Date().toISOString().slice(0, 10) } });
      await db.application.delete({ where: { id: app.id } });
      if (lead.customerId) await db.customer.delete({ where: { id: lead.customerId } }).catch(() => {});
    }
    await db.lead.update({ where: { id: leadId }, data: { status: "NEW", customerId: null, closedReason: null } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
  return h;
}
