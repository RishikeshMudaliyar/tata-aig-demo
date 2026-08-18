// Shared domain constants: roles, the "modules" the platform orchestrates, and helpers.

export type Role = "FLS" | "ADVISOR" | "ANALYST" | "UNDERWRITER" | "OPS" | "LEADERSHIP" | "ADMIN";

/** Roles that own a book and sell. Advisor is a seller, same surfaces as a Sales Agent. */
export const SELLING_ROLES: Role[] = ["FLS", "ADVISOR"];
export const isSeller = (r?: string | null) => r === "FLS" || r === "ADVISOR";

export const ROLE_LABEL: Record<Role, string> = {
  FLS: "Sales Agent",
  ADVISOR: "Advisor",
  ANALYST: "Risk Ops (NB Ops)",
  UNDERWRITER: "Underwriter",
  OPS: "Ops & Servicing",
  LEADERSHIP: "Leadership",
  ADMIN: "Admin",
};

// The existing Tata AIG digital assets our layer orchestrates (not replaces).
// The FIVE core modules exactly as Tata AIG's requirements document names them,
// plus one AI Intelligence overlay that sits on top. Nothing invented.
export const MODULES = [
  { key: "LeadMgmt", label: "Lead Management", overlay: false },
  { key: "Issuance", label: "Issuance Journey", overlay: false },
  { key: "CustMgmt", label: "Customer Management", overlay: false },
  { key: "SelfMgmt", label: "Self-Management", overlay: false },
  { key: "TeamMgmt", label: "Team Management", overlay: false },
  { key: "Intelligence", label: "AI Intelligence", overlay: true },
] as const;

export type ModuleKey = (typeof MODULES)[number]["key"];

// Back-end system tags used in seeded data map onto the five core modules.
const CANONICAL: Record<string, ModuleKey> = {
  LeadMgmt: "LeadMgmt",
  Issuance: "Issuance", Underwriting: "Issuance",
  CustMgmt: "CustMgmt", PolicyAdmin: "CustMgmt", CRM: "CustMgmt", Servicing: "CustMgmt", Billing: "CustMgmt",
  SelfMgmt: "SelfMgmt",
  TeamMgmt: "TeamMgmt", Agency: "TeamMgmt",
  Intelligence: "Intelligence", Analytics: "Intelligence",
};

export const canonicalModule = (key: string): string => CANONICAL[key] ?? key;

export const canonicalModules = (keys: string[]): string[] =>
  Array.from(new Set(keys.map(canonicalModule)));

export const moduleMeta = (key: string) => {
  const k = canonicalModule(key);
  return MODULES.find((m) => m.key === k) ?? { key: k, label: k, overlay: false };
};

// Currency formatting in Indian style (lakh / crore).
export function inr(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(n % 1e7 === 0 ? 0 : 2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(n % 1e5 === 0 ? 0 : 2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export function parseJSON<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}
