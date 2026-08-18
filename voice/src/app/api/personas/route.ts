import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * All roles are sign-in options — Sales Agent, Advisor, Risk Ops, Underwriter,
 * Ops & Servicing, Leadership, Admin. Each role's cockpit/pipeline view already has
 * dedicated logic (see src/lib/orchestration/composer.ts) for what that role sees.
 */
const ORDER: Record<string, number> = {
  FLS: 0, ADVISOR: 1, ANALYST: 2, UNDERWRITER: 3, OPS: 4, LEADERSHIP: 5, ADMIN: 6,
};

export async function GET() {
  const rows = await db.persona.findMany({
    orderBy: { id: "asc" },
    include: { manager: { select: { name: true } } },
  });

  const personas = [...rows].sort((a, b) => (ORDER[a.role] ?? 9) - (ORDER[b.role] ?? 9));

  return NextResponse.json({ personas });
}
