/**
 * MODULE ADAPTERS.
 * Each adapter is a thin connector to ONE existing Tata AIG digital asset.
 * In production these hit real backend systems; here they read the seeded store.
 * The point: the orchestration layer NEVER talks to a database directly — it
 * composes across these adapters, so "orchestrate existing modules" is the code.
 */
import { db } from "@/lib/db";
import { parseJSON } from "@/lib/domain";

export type Provenance = { module: string };

// --- Lead Management ----------------------------------------------------
export const LeadMgmt = {
  module: "LeadMgmt" as const,
  async leadsFor(ownerId: string) {
    const leads = await db.lead.findMany({ where: { ownerId }, orderBy: [{ score: "desc" }, { ageHours: "asc" }] });
    return leads.map((l) => ({ ...l, _module: "LeadMgmt" }));
  },
};

// --- Issuance / Applications -------------------------------------------
export const Issuance = {
  module: "Issuance" as const,
  async applicationsForFls(ownerId: string) {
    return db.application.findMany({
      where: { ownerId },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
    });
  },
  async application(id: string) {
    return db.application.findUnique({
      where: { id },
      include: { customer: true, owner: true },
    });
  },
};

// --- Policy Admin System (PAS) -----------------------------------------
export const PolicyAdmin = {
  module: "PolicyAdmin" as const,
  async policiesFor(customerId: string) {
    return db.policy.findMany({ where: { customerId } });
  },
  async policy(id: string) {
    return db.policy.findUnique({ where: { id }, include: { customer: true } });
  },
};

// --- Billing & Payments -------------------------------------------------
export const Billing = {
  module: "Billing" as const,
  async dueSummary(policyId: string) {
    const p = await db.policy.findUnique({ where: { id: policyId } });
    if (!p) return null;
    return { module: "Billing", premium: p.premium, mode: p.mode, dueDate: p.dueDate, status: p.status };
  },
};

// --- Customer Servicing -------------------------------------------------
export const Servicing = {
  module: "Servicing" as const,
  async openTickets(customerId: string) {
    return db.servicingTicket.findMany({ where: { customerId, status: { not: "RESOLVED" } }, orderBy: { openedAt: "asc" } });
  },
};

// --- CRM / Customer 360 -------------------------------------------------
export const CRM = {
  module: "CRM" as const,
  async customer(id: string) {
    return db.customer.findUnique({ where: { id } });
  },
};

// --- Agency / Advisor ---------------------------------------------------
export const Agency = {
  module: "Agency" as const,
  async isOrphan(policyId: string) {
    const p = await db.policy.findUnique({ where: { id: policyId } });
    return { module: "Agency", orphan: p?.advisorId == null, advisorId: p?.advisorId ?? null };
  },
  async activeAdvisorNear(_region: string) {
    return db.persona.findFirst({ where: { role: "FLS" }, orderBy: { name: "asc" } });
  },
};

// --- AI Analytics (lapse propensity) -----------------------------------
export const Analytics = {
  module: "Analytics" as const,
  async atRiskQueue() {
    const signals = await db.riskSignal.findMany({
      where: { status: { in: ["AT_RISK", "IN_PROGRESS"] } },
      include: { policy: { include: { customer: true, advisor: true } } },
      orderBy: { score: "desc" },
    });
    return signals.map((s) => ({
      ...s,
      reasonsParsed: parseJSON<{ label: string; module: string }[]>(s.reasons, []),
    }));
  },
};

// The five core modules exactly as Tata AIG's requirements document lists them,
// each with its sub-capabilities from that document. Rendered by the Platform page.
export const ADAPTER_REGISTRY = [
  { module: "LeadMgmt", ops: ["Lead Generation", "Pitch Creation", "Quotation", "Tasks & Meetings"] },
  { module: "Issuance", ops: ["Application & Payment", "Application Tracking", "Document Submission", "Underwriting"] },
  { module: "CustMgmt", ops: ["Customer 360", "Servicing", "Policy Events", "Upsell / Cross-sell"] },
  { module: "SelfMgmt", ops: ["KPI Tracking", "Incentives", "Contests", "Training & Assessments"] },
  { module: "TeamMgmt", ops: ["Team View", "Team KPIs", "Nudges", "Attendance"] },
];
