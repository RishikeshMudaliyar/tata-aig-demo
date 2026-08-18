/**
 * THE ORCHESTRATION / COMPOSER LAYER.
 * Each persona's cockpit is DERIVED LIVE from journey state — an item appears only
 * when it is that role's turn to act, and disappears the moment the action is done.
 */
import { db } from "@/lib/db";
import { parseJSON, canonicalModules, inr, isSeller } from "@/lib/domain";
import { Analytics, Billing, CRM, PolicyAdmin, Servicing, Agency } from "./adapters";
import type { Doc, SendBack } from "./journey";

export type ComposedTask = {
  id: string;
  title: string;
  detail: string | null;
  kind: string; // LEAD_CALL / COLLECT_DOCS / RESOLVE_SENDBACK / ANALYST_REVIEW / UW_DECIDE / SAVE / REASSIGN / TICKET / NUDGE / REVIEW
  priority: string;
  relatedId: string | null;
  sourceModules: string[];
  quick: { label: string; api: string; body: Record<string, unknown> } | null;
};

const T = (t: ComposedTask): ComposedTask => t;
const LEVEL_NAME: Record<string, string> = { AI: "AI scrutiny", ANALYST: "Risk Ops", UW: "Underwriter" };

export async function composeCockpit(personaId: string) {
  const persona = await db.persona.findUnique({ where: { id: personaId } });
  if (!persona) return null;

  const items: ComposedTask[] = [];

  // ---------- SALES (FLS) ----------
  if (isSeller(persona.role)) {
    // coaching nudges from leadership — top of the queue until acknowledged
    const nudges = await db.notification.findMany({
      where: { personaId, readAt: null, text: { startsWith: "[NUDGE:" } },
      orderBy: { createdAt: "desc" },
    });
    for (const n of nudges) {
      const m = /^\[NUDGE:([^\]]*)\]\s*([\s\S]*)$/.exec(n.text);
      items.push(T({
        id: `nudge-${n.id}`,
        title: `Nudge from ${m?.[1] ?? "Leadership"}`,
        detail: m?.[2] ?? n.text,
        kind: "NUDGE", priority: "HIGH", relatedId: n.href ?? null,
        sourceModules: ["TeamMgmt", "Intelligence"],
        quick: { label: "Got it", api: "/api/notifications", body: { id: n.id } },
      }));
    }

    // leads to call (NEW + due callbacks)
    const leads = await db.lead.findMany({ where: { ownerId: personaId, status: { in: ["NEW", "CALLBACK"] } }, orderBy: [{ score: "desc" }] });
    for (const l of leads) {
      items.push(T({
        id: `lead-${l.id}`,
        title: `${l.status === "CALLBACK" ? "Callback" : "First call"} — ${l.name}`,
        detail: `${l.source} · ${l.productInterest} · score ${l.score}`,
        kind: "LEAD_CALL", priority: l.status === "CALLBACK" || l.ageHours < 24 ? "HIGH" : "MEDIUM",
        relatedId: l.id, sourceModules: ["LeadMgmt", "Intelligence"], quick: null,
      }));
    }

    // applications where the ball is with sales
    const apps = await db.application.findMany({
      where: { ownerId: personaId, status: { in: ["DOC_COLLECTION", "SENT_BACK"] } },
      include: { customer: true },
    });
    for (const a of apps) {
      if (a.status === "DOC_COLLECTION") {
        const docs = parseJSON<Doc[]>(a.docs, []);
        const got = docs.filter((d) => d.status === "RECEIVED").length;
        items.push(T({
          id: `docs-${a.id}`, title: `Collect documents — ${a.customer.name}`,
          detail: `${got}/${docs.length} received · submit to underwriting when complete`,
          kind: "COLLECT_DOCS", priority: "HIGH", relatedId: a.id, sourceModules: ["Issuance"], quick: null,
        }));
      } else {
        const sb = parseJSON<SendBack[]>(a.sendBacks, []).find((s) => s.status === "OPEN");
        items.push(T({
          id: `sb-${a.id}`, title: `Sent back by ${LEVEL_NAME[a.sentBackTo ?? "UW"]} — ${a.customer.name}`,
          detail: sb ? sb.reasons.join(" · ") : "Clarification requested",
          kind: "RESOLVE_SENDBACK", priority: "HIGH", relatedId: a.id, sourceModules: ["Issuance", "Intelligence"], quick: null,
        }));
      }
    }

    // renewal saves on THEIR book
    const signals = await db.riskSignal.findMany({
      where: { status: { in: ["AT_RISK", "IN_PROGRESS"] }, policy: { advisorId: personaId } },
      include: { policy: { include: { customer: true } } },
      orderBy: { score: "desc" },
    });
    for (const s of signals) {
      items.push(T({ id: `save-${s.id}`, title: `Renewal save — ${s.policy.customer.name}`, detail: `${s.policy.product} · ${inr(s.policy.premium)} due ${s.policy.dueDate} · risk ${s.score}`, kind: "SAVE", priority: s.score >= 85 ? "HIGH" : "MEDIUM", relatedId: s.id, sourceModules: ["CustMgmt", "Intelligence"], quick: null }));
    }
  }

  // ---------- CASE ANALYST (L2) ----------
  if (persona.role === "ANALYST") {
    const apps = await db.application.findMany({ where: { analystId: personaId, status: "ANALYST_REVIEW" }, include: { customer: true }, orderBy: { stageChangedAt: "asc" } });
    for (const a of apps) {
      items.push(T({ id: `an-${a.id}`, title: `Review case — ${a.customer.name}`, detail: `${inr(a.sumAssured)} ${a.plan} · AI scrutiny passed · verify & forward to underwriter`, kind: "ANALYST_REVIEW", priority: "HIGH", relatedId: a.id, sourceModules: ["Issuance", "Intelligence"], quick: null }));
    }
  }

  // ---------- UNDERWRITER (L3) ----------
  if (persona.role === "UNDERWRITER") {
    const apps = await db.application.findMany({ where: { underwriterId: personaId, status: "UW_REVIEW" }, include: { customer: true }, orderBy: { stageChangedAt: "asc" } });
    for (const a of apps) {
      items.push(T({ id: `uw-${a.id}`, title: `Decision — ${a.customer.name}`, detail: `${inr(a.sumAssured)} ${a.plan} · case file verified by analyst`, kind: "UW_DECIDE", priority: "HIGH", relatedId: a.id, sourceModules: ["Issuance", "Intelligence"], quick: null }));
    }
  }

  // ---------- OPS: orphans + tickets ----------
  if (persona.role === "OPS") {
    const orphans = await db.riskSignal.findMany({
      where: { status: "AT_RISK", policy: { advisorId: null } },
      include: { policy: { include: { customer: true } } },
      orderBy: { score: "desc" },
    });
    for (const s of orphans) {
      items.push(T({ id: `reassign-${s.id}`, title: `Reassign orphan policy — ${s.policy.customer.name}`, detail: `${s.policy.product} · risk ${s.score} · due ${s.policy.dueDate}`, kind: "REASSIGN", priority: s.score >= 85 ? "HIGH" : "MEDIUM", relatedId: s.id, sourceModules: ["TeamMgmt", "CustMgmt", "Intelligence"], quick: null }));
    }
    const tickets = await db.servicingTicket.findMany({ where: { status: "OPEN" }, include: { customer: true }, orderBy: { openedAt: "asc" } });
    for (const t of tickets) {
      items.push(T({ id: `ticket-${t.id}`, title: `Resolve ${t.type.replace(/_/g, " ").toLowerCase()} — ${t.customer.name}`, detail: t.detail, kind: "TICKET", priority: "MEDIUM", relatedId: t.id, sourceModules: ["CustMgmt"], quick: { label: "Mark resolved", api: "/api/tickets", body: { ticketId: t.id, actorId: personaId } } }));
    }
  }

  // ---------- LEADERSHIP ----------
  if (persona.role === "LEADERSHIP") {
    const signals = await db.riskSignal.findMany({ where: { status: { in: ["AT_RISK", "IN_PROGRESS"] } }, include: { policy: true } });
    if (signals.length) {
      const premium = signals.reduce((s, x) => s + x.policy.premium, 0);
      items.push(T({ id: "book-risk", title: `${signals.length} policies at risk — ${inr(premium)} renewal premium at stake`, detail: null, kind: "REVIEW", priority: "HIGH", relatedId: null, sourceModules: ["CustMgmt", "Intelligence"], quick: null }));
    }
    const inPipeline = await db.application.count({ where: { status: { notIn: ["ISSUED", "DECLINED"] } } });
    if (inPipeline) {
      items.push(T({ id: "book-pipeline", title: `${inPipeline} applications in the issuance pipeline`, detail: null, kind: "REVIEW_PIPELINE", priority: "MEDIUM", relatedId: null, sourceModules: ["Issuance"], quick: null }));
    }
  }

  const order: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  items.sort((a, b) => (order[a.priority] ?? 2) - (order[b.priority] ?? 2));

  const modulesUsed = canonicalModules(items.flatMap((t) => t.sourceModules));
  return { persona, tasks: items, modulesUsed };
}

/** Customer-360, composed live across modules. */
export async function composeCustomer360(customerId: string) {
  const [customer, policies, tickets] = await Promise.all([
    CRM.customer(customerId),
    PolicyAdmin.policiesFor(customerId),
    Servicing.openTickets(customerId),
  ]);
  if (!customer) return null;

  const custApps = await db.application.findMany({ where: { customerId } });

  const enrichedPolicies = await Promise.all(
    policies.map(async (p) => {
      const [billing, orphan, risk] = await Promise.all([
        Billing.dueSummary(p.id),
        Agency.isOrphan(p.id),
        db.riskSignal.findFirst({ where: { policyId: p.id, status: { in: ["AT_RISK", "IN_PROGRESS"] } } }),
      ]);
      return {
        ...p,
        billing,
        orphan: orphan.orphan,
        risk: risk ? { score: risk.score, reasons: parseJSON<{ label: string; module: string }[]>(risk.reasons, []) } : null,
      };
    })
  );

  return {
    identity: { module: "CRM", ...customer },
    policies: { module: "PolicyAdmin", items: enrichedPolicies },
    servicing: { module: "Servicing", items: tickets },
    applications: { module: "Issuance", items: custApps },
    composedFrom: canonicalModules(["CRM", "PolicyAdmin", "Billing", "Servicing", "Agency", "Analytics", "Issuance"]),
  };
}

/** Lapse queue. For sales roles, scoped to THEIR book; Ops/Manager/Leadership see all. */
export async function composeLapseQueue(personaId?: string | null, role?: string | null) {
  const salesScoped = isSeller(role);
  const signals = await Analytics.atRiskQueue();
  const filtered = salesScoped ? signals.filter((s) => s.policy.advisorId === personaId) : signals;
  return filtered.map((s) => ({
    id: s.id,
    score: s.score,
    status: s.status,
    reasons: s.reasonsParsed,
    policyId: s.policyId,
    policyNo: s.policy.policyNo,
    product: s.policy.product,
    plan: s.policy.plan,
    fundValue: s.policy.fundValue,
    surrenderValue: s.policy.surrenderValue,
    premium: s.policy.premium,
    dueDate: s.policy.dueDate,
    cohortMonth: s.policy.cohortMonth,
    orphan: s.policy.advisorId == null,
    policyStatus: s.policy.status,
    customer: { id: s.policy.customer.id, name: s.policy.customer.name, language: s.policy.customer.language, city: s.policy.customer.city, phone: s.policy.customer.phone },
  }));
}
