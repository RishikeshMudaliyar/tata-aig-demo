import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import { parseJSON } from "@/lib/domain";
import { composeLapseQueue } from "@/lib/orchestration/composer";
import { draftSaveMessage, draftTalkTrack } from "@/lib/ai";
import { Agency } from "@/lib/orchestration/adapters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const signalId = req.nextUrl.searchParams.get("signalId");
  if (signalId) {
    const s = await db.riskSignal.findUnique({ where: { id: signalId }, include: { policy: { include: { customer: true, advisor: true } } } });
    if (!s) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ signal: { ...s, reasons: parseJSON(s.reasons, []) } });
  }
  const personaId = req.nextUrl.searchParams.get("personaId");
  const role = req.nextUrl.searchParams.get("role");
  const queue = await composeLapseQueue(personaId, role);
  return NextResponse.json({ queue });
}

export async function POST(req: NextRequest) {
  const { signalId, action, actorId } = await req.json();
  const signal = await db.riskSignal.findUnique({ where: { id: signalId }, include: { policy: { include: { customer: true } } } });
  if (!signal) return NextResponse.json({ error: "not found" }, { status: 404 });
  const policy = signal.policy;
  const reasons = parseJSON<{ label: string; module: string }[]>(signal.reasons, []).map((r) => r.label);

  if (action === "reassign") {
    const advisor = await Agency.activeAdvisorNear(policy.customer.city ?? "");
    await db.policy.update({ where: { id: policy.id }, data: { advisorId: advisor?.id ?? null } });
    await db.riskSignal.update({ where: { id: signalId }, data: { status: "IN_PROGRESS" } });
    await db.activityEvent.create({ data: { actorId: actorId ?? null, verb: "reassigned orphan policy", targetType: "Policy", targetId: policy.id, note: `Routed to salesperson ${advisor?.name ?? ""} with full context` } });
    return NextResponse.json({ ok: true, advisor: advisor?.name });
  }

  if (action === "draft") {
    const input = {
      customerName: policy.customer.name, language: policy.customer.language,
      product: policy.product, premium: policy.premium, dueDate: policy.dueDate,
      fundValue: policy.fundValue, reasons,
    };
    const [msg, track] = await Promise.all([draftSaveMessage(input), draftTalkTrack(input)]);
    return NextResponse.json({ ok: true, message: msg.text, talkTrack: track.text, aiSource: msg.source });
  }

  if (action === "remind") {
    await db.activityEvent.create({ data: { actorId: actorId ?? null, verb: "sent voice-assist renewal reminder", targetType: "Policy", targetId: policy.id, note: `Vernacular (${policy.customer.language}) reminder + secure pay link sent` } });
    return NextResponse.json({ ok: true });
  }

  if (action === "markSaved") {
    await db.policy.update({ where: { id: policy.id }, data: { status: policy.status === "LAPSED" ? "REVIVED" : "IN_FORCE" } });
    await db.riskSignal.update({ where: { id: signalId }, data: { status: "SAVED" } });
    // resolve any open servicing ticket as part of the save
    await db.servicingTicket.updateMany({ where: { policyId: policy.id, status: { not: "RESOLVED" } }, data: { status: "RESOLVED" } });
    await db.activityEvent.create({ data: { actorId: actorId ?? null, verb: "policy saved", targetType: "Policy", targetId: policy.id, note: "Renewal paid, pending ticket cleared — 1 of 1,62,088 retained" } });
    return NextResponse.json({ ok: true });
  }

  if (action === "reset") {
    await db.riskSignal.update({ where: { id: signalId }, data: { status: "AT_RISK" } });
    // re-open the policy's service queries that the save flow resolved
    await db.servicingTicket.updateMany({ where: { policyId: policy.id, status: "RESOLVED" }, data: { status: "OPEN" } });
    // restore original policy state, derived from the signal's own reasons
    const reasonText = reasons.join(" ").toLowerCase();
    const originalStatus = reasonText.includes("lapsed") ? "LAPSED" : reasonText.includes("grace") ? "GRACE" : "IN_FORCE";
    const wasReassigned = await db.activityEvent.findFirst({ where: { verb: "reassigned orphan policy", targetType: "Policy", targetId: policy.id } });
    await db.policy.update({ where: { id: policy.id }, data: { status: originalStatus, ...(wasReassigned ? { advisorId: null } : {}) } });
    if (wasReassigned) {
      await db.activityEvent.deleteMany({ where: { verb: "reassigned orphan policy", targetType: "Policy", targetId: policy.id } });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
