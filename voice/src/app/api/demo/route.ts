import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { seedAll } from "@/lib/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Demo control: full reset — wipes everything and re-seeds the original state. */
export async function POST() {
  await seedAll(db);
  return NextResponse.json({ ok: true });
}
