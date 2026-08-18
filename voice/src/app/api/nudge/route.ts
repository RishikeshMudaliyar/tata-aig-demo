import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseJSON, inr } from "@/lib/domain";
import { commissionRate } from "@/lib/quote";
import { KPI_TARGETS } from "@/lib/kpi";
import type { Doc } from "@/lib/orchestration/journey";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hrsSince = (d: Date) => (Date.now() - new Date(d).getTime()) / 3600_000;
const fmtAge = (h: number) => (h < 48 ? `${Math.round(h)}h` : `${Math.round(h / 24)}d`);

/**
 * GET /api/nudge?personaId=<fls>
 * Diagnoses where this salesperson is actually lagging — from live data, not a
 * generic "you're behind" — and drafts a specific, actionable nudge for each gap.
 */
export async function GET(req: NextRequest) {
  const personaId = req.nextUrl.searchParams.get("personaId");
  if (!personaId) return NextResponse.json({ error: "personaId required" }, { status: 400 });

  const person = await db.persona.findUnique({ where: { id: personaId } });
  if (!person) return NextResponse.json({ error: "not found" }, { status: 404 });

  const windowStart = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const [leads, apps, signals, recentNudge] = await Promise.all([
    db.lead.findMany({ where: { ownerId: personaId } }),
    db.application.findMany({ where: { ownerId: personaId }, include: { customer: true } }),
    db.riskSignal.findMany({ where: { policy: { advisorId: personaId } }, include: { policy: { include: { customer: true } } } }),
    db.notification.findFirst({ where: { personaId, text: { startsWith: "[NUDGE:" } }, orderBy: { createdAt: "desc" } }),
  ]);

  const issued = apps.filter((a) => a.status === "ISSUED" && a.stageChangedAt >= windowStart);
  const gwp = issued.reduce((s, a) => s + a.premium, 0);
  const gwpPct = Math.round((gwp / KPI_TARGETS.gwp) * 100);

  type Gap = { id: string; severity: "HIGH" | "MEDIUM"; title: string; evidence: string; draft: string; href?: string };
  const gaps: Gap[] = [];

  // 1) Cases sent back and sitting with them — the fastest money on the table
  for (const a of apps.filter((x) => x.status === "SENT_BACK")) {
    const age = hrsSince(a.stageChangedAt);
    const sb = parseJSON<{ reasons: string[]; status: string }[]>(a.sendBacks, []).find((s) => s.status === "OPEN");
    const unlock = Math.round(a.premium * commissionRate(a.product));
    gaps.push({
      id: `sb-${a.id}`,
      severity: age > 24 ? "HIGH" : "MEDIUM",
      title: `${a.customer.name} — sent back ${fmtAge(age)} ago`,
      evidence: sb?.reasons.join(" · ") ?? "Clarification pending",
      draft: `${a.customer.name}'s case has been waiting with you for ${fmtAge(age)} — ${sb?.reasons[0] ?? "info pending"}. Please clear it today; it unlocks ${inr(unlock)} on issue and it's holding up ${inr(a.premium)} of premium.`,
      href: `/case?id=${a.id}`,
    });
  }

  // 2) Documents stalled
  for (const a of apps.filter((x) => x.status === "DOC_COLLECTION")) {
    const docs = parseJSON<Doc[]>(a.docs, []);
    const pending = docs.filter((d) => d.status !== "RECEIVED");
    const age = hrsSince(a.stageChangedAt);
    if (pending.length && age > 4) {
      gaps.push({
        id: `doc-${a.id}`,
        severity: age > 48 ? "HIGH" : "MEDIUM",
        title: `${a.customer.name} — ${pending.length} document(s) pending ${fmtAge(age)}`,
        evidence: pending.map((d) => d.label).join(", "),
        draft: `${a.customer.name} is stuck at document collection for ${fmtAge(age)} — still waiting on ${pending.map((d) => d.label).join(", ")}. Collect it today and the file moves; ₹1,750 file-completion incentive is sitting there.`,
        href: `/case?id=${a.id}`,
      });
    }
  }

  // 3) Leads never touched
  const cold = leads.filter((l) => l.status === "NEW" && l.ageHours > 24).sort((a, b) => b.ageHours - a.ageHours);
  if (cold.length) {
    const worst = cold[0];
    gaps.push({
      id: `leads-${personaId}`,
      severity: worst.ageHours > 48 ? "HIGH" : "MEDIUM",
      title: `${cold.length} lead(s) untouched over 24h`,
      evidence: cold.slice(0, 3).map((l) => `${l.name} (${Math.round(l.ageHours)}h)`).join(", "),
      draft: `You have ${cold.length} lead${cold.length > 1 ? "s" : ""} not yet contacted — ${worst.name} has been waiting ${Math.round(worst.ageHours)}h. Call today, or delegate them to AI from the lead screen so nothing goes cold.`,
      href: `/lead?id=${worst.id}`,
    });
  }

  // 4) At-risk renewals on their book
  const atRisk = signals.filter((s) => s.status === "AT_RISK" || s.status === "IN_PROGRESS");
  if (atRisk.length) {
    const top = atRisk.sort((a, b) => b.score - a.score)[0];
    const prem = atRisk.reduce((s, x) => s + x.policy.premium, 0);
    gaps.push({
      id: `save-${personaId}`,
      severity: top.score >= 85 ? "HIGH" : "MEDIUM",
      title: `${atRisk.length} renewal(s) at risk — ${inr(prem)} premium`,
      evidence: `Highest: ${top.policy.customer.name}, risk ${top.score}, due ${top.policy.dueDate}`,
      draft: `${atRisk.length} of your policies are in the lapse window — ${top.policy.customer.name} is at risk ${top.score} and due ${top.policy.dueDate}. A save call this week protects ${inr(prem)} of renewal premium.`,
      href: `/lapse`,
    });
  }

  // 5) Premium pace — only if genuinely behind and nothing more specific dominates
  if (gwpPct < 60) {
    gaps.push({
      id: `gwp-${personaId}`,
      severity: gwpPct < 35 ? "HIGH" : "MEDIUM",
      title: `Premium at ${gwpPct}% of month target`,
      evidence: `${inr(gwp)} of ${inr(KPI_TARGETS.gwp)} · ${issued.length} of ${KPI_TARGETS.policies} policies issued`,
      draft: `You're at ${gwpPct}% of your premium target with ${inr(KPI_TARGETS.gwp - gwp)} to go. Your fastest route is the cases already in flight — clear the pending ones before chasing new leads.`,
      href: `/pipeline`,
    });
  }

  gaps.sort((a, b) => (a.severity === "HIGH" ? 0 : 1) - (b.severity === "HIGH" ? 0 : 1));

  return NextResponse.json({
    person: { id: person.id, name: person.name, branch: person.branch },
    headline: gaps.length ? gaps[0].title : "On track — no gaps detected",
    gaps,
    lastNudge: recentNudge ? { text: recentNudge.text.replace(/^\[NUDGE:[^\]]*\]\s*/, ""), at: recentNudge.createdAt, readAt: recentNudge.readAt } : null,
  });
}

/** POST — send the nudge: lands in their My Day + bell, and is logged. */
export async function POST(req: NextRequest) {
  const { fromId, toPersonaId, text, href } = await req.json();
  if (!toPersonaId || !text) return NextResponse.json({ error: "toPersonaId and text required" }, { status: 400 });

  const from = fromId ? await db.persona.findUnique({ where: { id: fromId } }) : null;

  await db.notification.create({
    data: { personaId: toPersonaId, text: `[NUDGE:${from?.name ?? "Leadership"}] ${text}`, href: href ?? "/cockpit" },
  });
  await db.activityEvent.create({
    data: { actorId: fromId ?? null, verb: "sent a coaching nudge", targetType: "Persona", targetId: toPersonaId, note: text.slice(0, 120) },
  });

  return NextResponse.json({ ok: true });
}
