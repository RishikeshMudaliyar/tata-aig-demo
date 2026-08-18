import { isSeller, SELLING_ROLES } from "@/lib/domain";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { commissionRate } from "@/lib/quote";
import { KPI_TARGETS, HEADLINE_KEY, type KpiCard } from "@/lib/kpi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const personaId = req.nextUrl.searchParams.get("personaId");
  const role = req.nextUrl.searchParams.get("role") ?? "";
  const self = isSeller(role);

  // sales managers in scope: self, or all (leadership / admin)
  const fls = await db.persona.findMany({ where: { role: { in: SELLING_ROLES } }, select: { id: true, name: true, branch: true } });
  const scope = self ? fls.filter((f) => f.id === personaId) : fls;
  const ids = scope.map((f) => f.id);

  const windowStart = new Date(Date.now() - 30 * 24 * 3600 * 1000);

  const [apps, leads, signals] = await Promise.all([
    db.application.findMany({ where: { ownerId: { in: ids } } }),
    db.lead.findMany({ where: { ownerId: { in: ids } } }),
    db.riskSignal.findMany({ where: { policy: { advisorId: { in: ids } } }, include: { policy: { select: { advisorId: true } } } }),
  ]);

  const cards: KpiCard[] = scope.map((f) => {
    const mine = apps.filter((a) => a.ownerId === f.id);
    const issued = mine.filter((a) => a.status === "ISSUED" && a.stageChangedAt >= windowStart);
    const applications = mine.filter((a) => a.createdAt >= windowStart);
    const directApps = applications.filter((a) => !a.leadId).length; // walk-ins etc. not from a lead record
    const engagedLeads = leads.filter((l) => l.ownerId === f.id && ["CALLBACK", "CONVERTED", "CLOSED"].includes(l.status)).length;
    // Monotonic by construction: worked ≥ applications ≥ policies
    const actuals: Record<string, number> = {
      leadsWorked: engagedLeads + directApps,
      applications: applications.length,
      policies: issued.length,
      gwp: issued.reduce((s, a) => s + a.premium, 0),
      incentive: Math.round(issued.reduce((s, a) => s + a.premium * commissionRate(a.product), 0)),
      saves: signals.filter((s) => s.policy.advisorId === f.id && s.status === "SAVED").length,
    };
    const attainment = Math.round(Math.min(1, actuals[HEADLINE_KEY] / KPI_TARGETS[HEADLINE_KEY]) * 100);
    return { persona: f, actuals, attainment };
  });

  cards.sort((a, b) => b.attainment - a.attainment);

  const month = new Date().toLocaleString("en-IN", { month: "long", year: "numeric" });
  return NextResponse.json({ scope: self ? "self" : "team", month, targets: KPI_TARGETS, cards });
}
