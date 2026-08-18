import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Exactly four logins: Sales Agent, Advisor, Leadership, Admin.
 *
 * Other personas stay in the database on purpose — the other sales people populate the
 * leadership incentive table, and Risk Ops / Underwriting still own the cases the pipeline
 * view reads. They are simply not sign-in options. One persona per role, picked
 * deterministically so the demo looks identical every time.
 */
const ORDER: Record<string, number> = { FLS: 0, ADVISOR: 1, LEADERSHIP: 2, ADMIN: 3 };

export async function GET() {
  const rows = await db.persona.findMany({
    where: { role: { in: ["FLS", "ADVISOR", "LEADERSHIP", "ADMIN"] } },
    orderBy: { id: "asc" },
    include: { manager: { select: { name: true } } },
  });

  const seen = new Set<string>();
  const personas = rows
    .filter((p) => !seen.has(p.role) && seen.add(p.role))
    .sort((a, b) => (ORDER[a.role] ?? 9) - (ORDER[b.role] ?? 9));

  return NextResponse.json({ personas });
}
