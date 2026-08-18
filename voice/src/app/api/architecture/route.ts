import { NextResponse } from "next/server";
import { ADAPTER_REGISTRY } from "@/lib/orchestration/adapters";
import { MODULES } from "@/lib/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ modules: MODULES, adapters: ADAPTER_REGISTRY });
}
