/**
 * Quotation + incentive simulation — deterministic, illustrative, and configurable.
 * The premiums scale from the AI-recommended anchor (cover, premium); the commission
 * rates and monthly target are representative placeholders a real integration would
 * replace with Bajaj's actual rate card. Everything here is pure (no I/O).
 */

export type QuoteOption = { cover: number; annual: number; monthly: number; recommended: boolean };

const round5L = (x: number) => Math.max(500000, Math.round(x / 500000) * 500000);

/** Three cover tiers around the recommended cover, premiums scaled linearly from the anchor. */
export function quoteOptions(cover: number, premium: number): QuoteOption[] {
  const tiers = [round5L(cover * 0.67), cover, round5L(cover * 1.34)];
  const seen = new Set<number>();
  return tiers
    .filter((c) => (seen.has(c) ? false : (seen.add(c), true)))
    .map((c) => ({
      cover: c,
      annual: Math.round((premium * c) / cover / 100) * 100,
      monthly: Math.round((premium * c) / cover / 12 / 10) * 10,
      recommended: c === cover,
    }));
}

/** Return-of-premium roughly ~1.6x a pure-term premium (term plans only). */
export const ROP_MULTIPLIER = 1.6;

export function isTermPlan(s: string): boolean {
  const t = (s || "").toLowerCase();
  return t.includes("term") || t.includes("protect") || t.includes("etouch") || t.includes("saral jeevan");
}

/** Illustrative first-year commission rate by product family (configurable). */
export function commissionRate(product: string): number {
  const s = (product || "").toLowerCase();
  if (s.includes("ulip") || s.includes("goal assure") || s.includes("wealth") || s.includes("smart wealth")) return 0.06;
  if (isTermPlan(s)) return 0.28;
  if (s.includes("annuity") || s.includes("pension")) return 0.02;
  return 0.15; // par / non-par savings
}

/** Illustrative monthly first-year-commission target for a Sales Manager. */
export const MONTHLY_INCENTIVE_TARGET = 60000;

/** Staged incentive ladder — small payouts early, the big one on issue, trail on renewal. */
export type IncentiveStage = { key: string; label: string; amount: number; trail?: boolean; note?: string };

export function incentiveLadder(product: string, premium: number): IncentiveStage[] {
  const firstYear = Math.round((premium * commissionRate(product)) / 10) * 10;
  const trailPerYear = Math.round((premium * 0.02) / 10) * 10; // ~2%/yr renewal trail
  return [
    { key: "engaged", label: "Cold → interested", amount: 150, note: "activation bonus on a converted lead" },
    { key: "docs", label: "Documents collected & submitted", amount: 1750, note: "file-completion bonus" },
    { key: "issued", label: "Policy issued", amount: firstYear, note: `first-year commission (~${Math.round(commissionRate(product) * 100)}%)` },
    { key: "trail", label: "Renewal trail", amount: trailPerYear, trail: true, note: "~2% of premium, each renewal year" },
  ];
}

/** Which ladder stages are already earned, given where the lead/application is. */
export function earnedStages(status: string | null): Set<string> {
  const earned = new Set<string>();
  if (!status) return earned;
  if (["CONVERTED", "DOC_COLLECTION", "ANALYST_REVIEW", "UW_REVIEW", "SENT_BACK", "ISSUED"].includes(status)) earned.add("engaged");
  if (["ANALYST_REVIEW", "UW_REVIEW", "SENT_BACK", "ISSUED"].includes(status)) earned.add("docs");
  if (status === "ISSUED") { earned.add("issued"); earned.add("trail"); }
  return earned;
}
