import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const metrics = await db.metricSnapshot.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }] });
  const grouped: Record<string, typeof metrics> = {};
  for (const m of metrics) (grouped[m.category] ??= []).push(m);

  // live retention counters for the persistency gauge
  const [saved, atRisk, lapsed] = await Promise.all([
    db.riskSignal.count({ where: { status: "SAVED" } }),
    db.riskSignal.count({ where: { status: { in: ["AT_RISK", "IN_PROGRESS"] } } }),
    db.riskSignal.count({ where: { status: "LAPSED" } }),
  ]);

  return NextResponse.json({ grouped, live: { saved, atRisk, lapsed } });
}
