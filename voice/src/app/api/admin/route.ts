import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appStageMeta, advanceOnRead } from "@/lib/orchestration/journey";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Control-tower feed: every new-business journey item as a kanban entity with its
 * full stage-transition history (reconstructed from the activity timeline), so the
 * client can render the board at any point in time (time-lapse slider).
 * Stages: LEAD → DOC_COLLECTION → ANALYST_REVIEW → UW_REVIEW → (SENT_BACK ⇆) → ISSUED
 */

function stageFromVerb(verb: string): string | null {
  if (verb.startsWith("converted lead & opened application")) return "DOC_COLLECTION";
  if (verb.includes("flags, sent back to sales")) return "SENT_BACK";
  if (verb.startsWith("submitted to underwriting")) return "ANALYST_REVIEW"; // AI scrutiny is instant
  if (verb.startsWith("AI scrutiny passed")) return "ANALYST_REVIEW";
  if (verb.startsWith("verified case file & forwarded")) return "UW_REVIEW";
  if (verb.startsWith("sent back to sales")) return "SENT_BACK";
  if (verb.startsWith("resolved send-back — returned to underwriter")) return "UW_REVIEW";
  if (verb.startsWith("resolved send-back — returned to Risk Ops")) return "ANALYST_REVIEW";
  if (verb.startsWith("cleared & issued policy")) return "ISSUED";
  return null;
}

export async function GET() {
  const [leads, apps, personas] = await Promise.all([
    db.lead.findMany({ include: { owner: { select: { id: true, name: true } } } }),
    db.application.findMany({ include: { customer: true, owner: { select: { id: true, name: true } } } }),
    db.persona.findMany({ select: { id: true, name: true, role: true } }),
  ]);
  const byId = new Map(personas.map((p) => [p.id, p]));
  const appIds = apps.map((a) => a.id);
  const events = await db.activityEvent.findMany({
    where: { targetType: "Application", targetId: { in: appIds } },
    orderBy: { createdAt: "asc" },
  });
  const eventsByApp = new Map<string, { verb: string; at: Date }[]>();
  for (const e of events) {
    if (!e.targetId) continue;
    if (!eventsByApp.has(e.targetId)) eventsByApp.set(e.targetId, []);
    eventsByApp.get(e.targetId)!.push({ verb: e.verb, at: e.createdAt });
  }
  const leadById = new Map(leads.map((l) => [l.id, l]));

  const entities: any[] = [];

  // Converted leads continue as their application — one card flowing across the board.
  for (const a of apps) {
    await advanceOnRead(a);
    const fresh = (await db.application.findUnique({ where: { id: a.id } })) ?? a;
    const analyst = a.analystId ? byId.get(a.analystId) : null;
    const uw = a.underwriterId ? byId.get(a.underwriterId) : null;
    const meta = appStageMeta(fresh, { owner: a.owner?.name, analyst: analyst?.name, uw: uw?.name });

    const transitions: { stage: string; at: string }[] = [];
    const srcLead = a.leadId ? leadById.get(a.leadId) : null;
    if (srcLead) transitions.push({ stage: "LEAD", at: new Date(Date.now() - srcLead.ageHours * 3600_000).toISOString() });
    transitions.push({ stage: "DOC_COLLECTION", at: a.createdAt.toISOString() });
    for (const e of eventsByApp.get(a.id) ?? []) {
      const st = stageFromVerb(e.verb);
      if (st && st !== transitions[transitions.length - 1]?.stage) transitions.push({ stage: st, at: e.at.toISOString() });
    }

    entities.push({
      id: `app-${a.id}`, href: `/case?id=${a.id}`,
      customer: a.customer.name, product: `${a.product} · ${a.plan}`, value: a.premium,
      stage: fresh.status === "DECLINED" ? "ISSUED" : fresh.status,
      owner: a.owner?.name ?? null, analyst: analyst?.name ?? null, uw: uw?.name ?? null,
      holder: meta.holder?.name ?? null,
      sinceISO: fresh.stageChangedAt.toISOString(),
      transitions,
    });
  }

  // Unconverted, open leads sit in the Lead column.
  for (const l of leads) {
    if (l.status === "CONVERTED" || l.status === "CLOSED") continue;
    entities.push({
      id: `lead-${l.id}`, href: `/lead?id=${l.id}`,
      customer: l.name, product: l.productInterest, value: 0,
      stage: "LEAD",
      owner: l.owner?.name ?? null, analyst: null, uw: null,
      holder: l.owner?.name ?? null,
      sinceISO: new Date(Date.now() - l.ageHours * 3600_000).toISOString(),
      transitions: [{ stage: "LEAD", at: new Date(Date.now() - l.ageHours * 3600_000).toISOString() }],
    });
  }

  const people = personas
    .filter((p) => ["FLS", "ADVISOR", "ANALYST", "UNDERWRITER"].includes(p.role))
    .map((p) => ({ name: p.name, role: p.role }));

  return NextResponse.json({ entities, people, now: new Date().toISOString() });
}
