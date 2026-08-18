import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseJSON, isSeller } from "@/lib/domain";
import { appStageMeta, advanceOnRead, STAGE_SLA_HOURS, type PipelineRow } from "@/lib/orchestration/journey";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const personaId = req.nextUrl.searchParams.get("personaId");
  const role = req.nextUrl.searchParams.get("role") ?? "";

  // scope: sales → own book; manager → team; everyone else → all
  let ownerIds: string[] | null = null;
  if (isSeller(role)) ownerIds = [personaId!];

  // one parallel wave for every read — latency to Neon is per-round-trip, so batching matters
  const leadWhere = ownerIds ? { ownerId: { in: ownerIds } } : {};
  const [leads, apps, personas, signals, tickets] = await Promise.all([
    db.lead.findMany({ where: leadWhere, include: { owner: { select: { id: true, name: true } } } }),
    db.application.findMany({ where: ownerIds ? { ownerId: { in: ownerIds } } : {}, include: { customer: true, owner: { select: { id: true, name: true } } } }),
    db.persona.findMany({ select: { id: true, name: true, role: true } }),
    db.riskSignal.findMany({ where: ownerIds ? { policy: { advisorId: { in: ownerIds } } } : {}, include: { policy: { include: { customer: true, advisor: { select: { name: true } } } } }, orderBy: { score: "desc" } }),
    db.servicingTicket.findMany({ where: { status: { not: "RESOLVED" }, ...(ownerIds ? { policy: { advisorId: { in: ownerIds } } } : {}) }, include: { customer: true, policy: { include: { advisor: { select: { name: true } } } } }, orderBy: { openedAt: "asc" } }),
  ]);
  const byId = new Map(personas.map((p) => [p.id, p]));

  const rows: PipelineRow[] = [];

  // Leads not yet converted
  for (const l of leads) {
    if (l.status === "CONVERTED") continue; // represented by its application row
    const active = l.status === "NEW" || l.status === "CALLBACK";
    rows.push({
      owner: l.owner?.name ?? null,
      id: `lead-${l.id}`, kind: "LEAD",
      customer: l.name, product: l.productInterest, value: 0,
      stage: l.status, stageLabel: l.status === "CALLBACK" ? "Lead — callback scheduled" : l.status === "CLOSED" ? `Closed — ${l.closedReason ?? "not interested"}` : "Lead — first call pending",
      holder: active ? { name: l.owner?.name ?? "Sales", role: "Sales" } : null,
      missing: active ? "First conversation" : "—",
      nextStep: l.status === "CALLBACK" ? "Callback at requested time" : active ? "Call with AI copilot brief" : "—",
      sinceISO: new Date(Date.now() - l.ageHours * 3600_000).toISOString(),
      slaHours: active && l.status !== "CALLBACK" ? STAGE_SLA_HOURS.LEAD : null,
      active,
    });
  }

  // Applications on the journey — advance doc/tele-MER state in parallel (no re-fetch;
  // advanceOnRead never changes status/sentBackTo, so the row is built from `a` + fresh docs).
  const appRows: PipelineRow[] = await Promise.all(apps.map(async (a) => {
    const { docs, caseFile } = await advanceOnRead(a);
    const merged = { ...a, docs: JSON.stringify(docs), caseFile: JSON.stringify(caseFile) };
    const analyst = a.analystId ? byId.get(a.analystId) : null;
    const uwP = a.underwriterId ? byId.get(a.underwriterId) : null;
    const meta = appStageMeta(merged, { owner: a.owner?.name, analyst: analyst?.name, uw: uwP?.name });
    const active = a.status !== "ISSUED" && a.status !== "DECLINED";
    return {
      owner: a.owner?.name ?? null,
      id: `app-${a.id}`, kind: "APP" as const,
      customer: a.customer.name, product: `${a.product} · ${a.plan}`, value: a.premium,
      stage: a.status, stageLabel: meta.stageLabel,
      holder: meta.holder ? { name: meta.holder.name, role: meta.holder.role } : null,
      missing: meta.missing, nextStep: meta.nextStep,
      sinceISO: a.stageChangedAt.toISOString(),
      slaHours: meta.sla,
      active,
    };
  }));
  rows.push(...appRows);

  // Retention tab rows
  const retention: PipelineRow[] = signals.map((s) => {
    const reasons = parseJSON<{ label: string }[]>(s.reasons, []);
    const orphan = s.policy.advisorId == null;
    const active = s.status === "AT_RISK" || s.status === "IN_PROGRESS";
    return {
      owner: s.policy.advisor?.name ?? null,
      id: `ret-${s.id}`, kind: "RETENTION" as const,
      customer: s.policy.customer.name, product: `${s.policy.product} · ${s.policy.plan}`, value: s.policy.premium,
      stage: s.status,
      stageLabel: s.status === "SAVED" ? "Saved — renewed" : orphan ? `At risk (${s.score}) — orphan` : `At risk (${s.score})`,
      holder: !active ? null : orphan ? { name: "Ops", role: "Ops" } : { name: s.policy.advisor?.name ?? "Sales", role: "Sales" },
      missing: active ? (reasons[0]?.label ?? "—") : "—",
      nextStep: !active ? "—" : orphan ? "Reassign to a salesperson" : `Save call before ${s.policy.dueDate}`,
      sinceISO: s.detectedAt.toISOString(),
      slaHours: active ? 72 : null,
      active,
    };
  });

  // Open servicing queries — held by Ops (leadership oversight; scoped roles see only their book's)
  const ops = personas.find((p) => p.role === "OPS");
  for (const t of tickets) {
    retention.push({
      owner: t.policy?.advisor?.name ?? null,
      id: `query-${t.id}`, kind: "QUERY",
      customer: t.customer.name, product: t.policy ? `${t.policy.product} · ${t.policy.plan}` : t.type, value: t.policy?.premium ?? 0,
      stage: "QUERY_OPEN", stageLabel: `Service query — ${t.type.replace(/_/g, " ").toLowerCase()}`,
      holder: { name: ops?.name ?? "Ops", role: "Ops" },
      missing: t.detail, nextStep: "Resolve with customer",
      sinceISO: t.openedAt.toISOString(),
      slaHours: 48,
      active: true,
    });
  }

  return NextResponse.json({ newBusiness: rows, retention });
}
