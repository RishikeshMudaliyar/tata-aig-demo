/**
 * THE UNIFIED ISSUANCE JOURNEY.
 * Lead → first call (copilot) → convert → document collection → submit →
 * AI scrutiny (L1) → Risk Ops (L2) → underwriter (L3) → issued.
 * Any level can SEND BACK to the same salesperson; on resolve the case returns
 * to the level that asked. Documents arrive on their own (customer upload,
 * simulated on read) or are collected manually by sales. Tele-MER is booked
 * automatically on submit and its report is consumed by the analyst/UW.
 */
import { db } from "@/lib/db";
import { parseJSON } from "@/lib/domain";

// ---------- types ----------
export type Doc = { key: string; label: string; status: "PENDING" | "RECEIVED"; via: "CUSTOMER" | "SALES" | null; at: string | null };
export type SendBack = { id: string; level: "AI" | "ANALYST" | "UW"; reasons: string[]; note: string | null; status: "OPEN" | "RESOLVED"; at: string; resolvedNote?: string | null; resolvedAt?: string | null };
export type CaseFile = {
  aiScrutiny?: { result: "PASS" | "FLAGS"; notes: string[]; at: string };
  analystNote?: string | null;
  hlv?: number | null;
  aggregateCover?: number | null;
  authorityBand?: string | null;
  teleMer?: { status: "NOT_REQUIRED" | "SCHEDULED" | "COMPLETED"; scheduledAt?: string; report?: string | null };
  uwRequest?: { status: string; label: string; at: string; data: string };
};

// ---------- stage metadata ----------
export const STAGES = [
  { key: "LEAD", label: "Lead" },
  { key: "DOC_COLLECTION", label: "Documents" },
  { key: "AI_SCRUTINY", label: "AI scrutiny" },
  { key: "ANALYST_REVIEW", label: "Risk Ops" },
  { key: "UW_REVIEW", label: "Underwriter" },
  { key: "ISSUED", label: "Issued" },
] as const;

// SLA hours per stage — shown ONLY on the pipeline view.
export const STAGE_SLA_HOURS: Record<string, number> = {
  LEAD: 24, DOC_COLLECTION: 48, ANALYST_REVIEW: 4, UW_REVIEW: 8, SENT_BACK: 24,
};

export const SENDBACK_REASONS = [
  "Income proof missing / unclear",
  "KYC name mismatch (PAN vs Aadhaar)",
  "Aggregate-cover clarification needed",
  "Medical information needed",
  "Nominee / bank details incomplete",
] as const;

export const STANDARD_DOCS: Omit<Doc, "status" | "via" | "at">[] = [
  { key: "pan", label: "PAN card" },
  { key: "aadhaar", label: "Aadhaar" },
  { key: "photo", label: "Photograph" },
  { key: "itr", label: "Income proof (ITR)" },
];

export const newDocs = (): Doc[] => STANDARD_DOCS.map((d) => ({ ...d, status: "PENDING", via: null, at: null }));

export const authorityBandFor = (sumAssured: number, hlvBreach: boolean): string => {
  if (hlvBreach || sumAssured > 3_00_00_000) return "Chief UW / CMO referral";
  if (sumAssured > 50_00_000) return "Senior underwriter (₹50L – ₹3 Cr)";
  return "Junior underwriter (≤ ₹50L)";
};

// ---------- lazy progression (no cron: state advances when read) ----------
const DOC_ARRIVAL_SECONDS = [8, 18, 30]; // first 3 docs "uploaded by the customer" over time; the 4th is collected by sales
const TELEMER_SECONDS = 25;

export async function advanceOnRead(app: { id: string; status: string; createdAt: Date; docs: string; caseFile: string; customerId: string }) {
  let changed = false;
  const docs = parseJSON<Doc[]>(app.docs, []);
  const caseFile = parseJSON<CaseFile>(app.caseFile, {});

  if (app.status === "DOC_COLLECTION") {
    const elapsed = (Date.now() - new Date(app.createdAt).getTime()) / 1000;
    let arriving = 0;
    for (const d of docs) {
      if (d.status === "PENDING" && d.key !== "itr" && arriving < DOC_ARRIVAL_SECONDS.length) {
        if (elapsed >= DOC_ARRIVAL_SECONDS[arriving]) {
          d.status = "RECEIVED"; d.via = "CUSTOMER"; d.at = new Date().toISOString();
          changed = true;
          await db.activityEvent.create({ data: { verb: "customer uploaded document", targetType: "Application", targetId: app.id, note: d.label } });
        }
        arriving++;
      }
    }
  }

  if (caseFile.teleMer?.status === "SCHEDULED" && caseFile.teleMer.scheduledAt) {
    const elapsed = (Date.now() - new Date(caseFile.teleMer.scheduledAt).getTime()) / 1000;
    if (elapsed >= TELEMER_SECONDS) {
      caseFile.teleMer = {
        status: "COMPLETED",
        scheduledAt: caseFile.teleMer.scheduledAt,
        report: "Tele-MER report: BP 128/84 (normal) · BMI 23.4 · non-smoker confirmed · no adverse disclosures. Standard rates apply.",
      };
      changed = true;
      await db.activityEvent.create({ data: { verb: "tele-MER completed — report attached to case", targetType: "Application", targetId: app.id, note: "TPA vendor" } });
    }
  }

  if (changed) {
    await db.application.update({ where: { id: app.id }, data: { docs: JSON.stringify(docs), caseFile: JSON.stringify(caseFile) } });
  }
  return { docs, caseFile, changed };
}

// ---------- L1: AI scrutiny (runs synchronously on submit / resolve) ----------
export function runAiScrutiny(input: { panName?: string | null; aadhaarName?: string | null; sumAssured: number; incomeAnnual?: number | null; docs: Doc[] }): { result: "PASS" | "FLAGS"; notes: string[] } {
  const notes: string[] = [];
  if (input.panName && input.aadhaarName && input.panName !== input.aadhaarName) {
    notes.push(`KYC name mismatch: PAN '${input.panName}' vs Aadhaar '${input.aadhaarName}'`);
  }
  const pendingDocs = input.docs.filter((d) => d.status !== "RECEIVED");
  if (pendingDocs.length) notes.push(`Documents incomplete: ${pendingDocs.map((d) => d.label).join(", ")}`);
  if (input.incomeAnnual && input.sumAssured > input.incomeAnnual * 20) {
    notes.push(`Cover ${Math.round(input.sumAssured / input.incomeAnnual)}x of declared income — above 20x grid`);
  }
  return notes.length ? { result: "FLAGS", notes } : { result: "PASS", notes: ["Documents complete", "KYC consistent", "Cover within income grid"] };
}

// ---------- pipeline-row derivation: where it sits, what's missing, what's next ----------
export type PipelineRow = {
  owner?: string | null;
  id: string;
  kind: "LEAD" | "APP" | "RETENTION" | "QUERY";
  customer: string;
  product: string;
  value: number; // premium ₹/yr (or at-stake for retention)
  stage: string;
  stageLabel: string;
  holder: { name: string; role: string } | null;
  missing: string;
  nextStep: string;
  sinceISO: string | null;
  slaHours: number | null;
  active: boolean;
};

export function appStageMeta(app: { status: string; sentBackTo: string | null; docs: string; sendBacks: string; caseFile: string }, people: { owner?: string | null; analyst?: string | null; uw?: string | null }) {
  const docs = parseJSON<Doc[]>(app.docs, []);
  const sendBacks = parseJSON<SendBack[]>(app.sendBacks, []);
  const openSB = sendBacks.find((s) => s.status === "OPEN");
  const pending = docs.filter((d) => d.status !== "RECEIVED");
  const levelName: Record<string, string> = { AI: "AI scrutiny", ANALYST: "Risk Ops", UW: "Underwriter" };

  switch (app.status) {
    case "DOC_COLLECTION":
      return {
        stageLabel: "Document collection",
        holder: { name: people.owner ?? "Sales", role: "Sales" },
        missing: pending.length ? `${pending.length} doc${pending.length > 1 ? "s" : ""}: ${pending.map((d) => d.label).join(", ")}` : "None — ready to submit",
        nextStep: pending.length ? "Collect remaining documents" : "Submit to underwriting",
        sla: STAGE_SLA_HOURS.DOC_COLLECTION,
      };
    case "SENT_BACK":
      return {
        stageLabel: `Sent back — ${levelName[app.sentBackTo ?? "UW"]}`,
        holder: { name: people.owner ?? "Sales", role: "Sales" },
        missing: openSB ? openSB.reasons.join(" · ") : "Clarification requested",
        nextStep: `Provide info → returns to ${levelName[app.sentBackTo ?? "UW"]}`,
        sla: STAGE_SLA_HOURS.SENT_BACK,
      };
    case "ANALYST_REVIEW":
      return {
        stageLabel: "Risk Ops review",
        holder: { name: people.analyst ?? "Risk Ops", role: "Analyst" },
        missing: "—",
        nextStep: "Verify case file → forward to underwriter",
        sla: STAGE_SLA_HOURS.ANALYST_REVIEW,
      };
    case "UW_REVIEW":
      return {
        stageLabel: "Underwriter decision",
        holder: { name: people.uw ?? "Underwriter", role: "Underwriter" },
        missing: "—",
        nextStep: "Decision — issue / send back",
        sla: STAGE_SLA_HOURS.UW_REVIEW,
      };
    case "ISSUED":
      return { stageLabel: "Issued", holder: null, missing: "—", nextStep: "—", sla: null };
    default:
      return { stageLabel: app.status, holder: null, missing: "—", nextStep: "—", sla: null };
  }
}
