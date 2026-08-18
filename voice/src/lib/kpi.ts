/**
 * Monthly KPI targets for a Sales Manager — illustrative & configurable.
 * Actuals are derived from live data and kept MONOTONIC (worked ≥ applications ≥
 * policies) so the cards reconcile at a glance. The headline attainment is the
 * GWP attainment, so the top number always equals a visible tile.
 */
export const KPI_TARGETS: Record<string, number> = {
  leadsWorked: 25,    // leads actively worked this month
  applications: 10,   // applications opened
  policies: 6,        // policies issued
  gwp: 300000,        // new premium (first-year GWP) ₹
  incentive: 75000,   // first-year commission earned ₹
  saves: 4,           // renewals saved
};

export const KPI_DEFS = [
  { key: "gwp", label: "New premium (GWP)", money: true },
  { key: "policies", label: "Policies issued", money: false },
  { key: "incentive", label: "Incentive earned", money: true },
  { key: "applications", label: "Applications opened", money: false },
  { key: "leadsWorked", label: "Leads worked", money: false },
  { key: "saves", label: "Renewals saved", money: false },
] as const;

/** The single KPI that drives the headline attainment %. */
export const HEADLINE_KEY = "gwp";

export type KpiCard = {
  persona: { id: string; name: string; branch: string | null };
  actuals: Record<string, number>;
  attainment: number; // 0-100 = GWP attainment (matches the GWP tile)
};
