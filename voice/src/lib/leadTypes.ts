/**
 * Lead-type catalog. Scoring rationale is driven by the lead's SOURCE TYPE (the
 * data that's actually available at assignment) — not granular per-user behaviour.
 */
export type LeadTypeMeta = { label: string; intent: string; why: string };

export const LEAD_TYPES: Record<string, LeadTypeMeta> = {
  "Hand-raise": { label: "Hand-raise", intent: "Very high", why: "Actively requested a quote or coverage — top-of-funnel intent. Same-day contact converts materially better." },
  ETB: { label: "ETB — existing customer", intent: "High", why: "Already banks / holds a policy with Bajaj — KYC pre-verified, trust established, strong cross-sell fit." },
  D2C: { label: "D2C — self-serve", intent: "Medium-high", why: "Came through Bajaj's own site/app and is researching independently — guide with one clear recommendation." },
  VEM: { label: "VEM — virtual engagement", intent: "Medium", why: "From the virtual-engagement pool — best worked over video / WhatsApp; no branch visit needed." },
  "Sub-VEM": { label: "Sub-VEM — curated segment", intent: "Medium", why: "Curated micro-segment (life-stage / renewal-window match) for a personalised virtual campaign." },
  Referral: { label: "Referral", intent: "High", why: "Referred by an existing customer — trust is pre-built; referrals close ~3× the cold rate." },
  Branch: { label: "Branch walk-in", intent: "Very high", why: "Walked into a branch — the highest-intent channel. Act before the intent cools." },
};

/** 2–3 scoring reasons for a lead: the type rationale + a couple of profile signals. */
export function scoringReasons(leadType: string | undefined, income: number | null | undefined, productInterest?: string): string[] {
  const reasons: string[] = [];
  const meta = leadType ? LEAD_TYPES[leadType] : undefined;
  if (meta) reasons.push(`${meta.label} — ${meta.why}`);
  if (income) {
    const band = income >= 2500000 ? "₹25L+ (HNI)" : income >= 1500000 ? "₹15–25L" : income >= 800000 ? "₹8–15L" : "mass";
    reasons.push(`Income band ${band} — matched to products this segment issues at the highest rates.`);
  }
  if (productInterest) reasons.push(`Stated interest: ${productInterest} — recommendation and quote below are matched to it.`);
  return reasons;
}
