import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseJSON } from "@/lib/domain";
import { advanceOnRead, runAiScrutiny, authorityBandFor, type Doc, type SendBack, type CaseFile } from "@/lib/orchestration/journey";
import { notify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadCase(id: string) {
  const app = await db.application.findUnique({ where: { id }, include: { customer: true, owner: true } });
  if (!app) return null;
  const { docs, caseFile } = await advanceOnRead(app);
  const [analystP, uwP] = await Promise.all([
    app.analystId ? db.persona.findUnique({ where: { id: app.analystId } }) : null,
    app.underwriterId ? db.persona.findUnique({ where: { id: app.underwriterId } }) : null,
  ]);
  return {
    ...app,
    docsParsed: docs,
    caseFileParsed: caseFile,
    sendBacksParsed: parseJSON<SendBack[]>(app.sendBacks, []),
    analyst: analystP ? { name: analystP.name, initials: analystP.initials } : null,
    underwriter: uwP ? { name: uwP.name, initials: uwP.initials } : null,
  };
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const c = await loadCase(id);
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ case: c });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { applicationId, action, actorId } = body;
  const app = await db.application.findUnique({ where: { id: applicationId }, include: { customer: true } });
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });

  const docs = parseJSON<Doc[]>(app.docs, []);
  const caseFile = parseJSON<CaseFile>(app.caseFile, {});
  const sendBacks = parseJSON<SendBack[]>(app.sendBacks, []);
  const now = new Date();
  const event = (verb: string, note?: string, actor?: string | null) =>
    db.activityEvent.create({ data: { actorId: actor ?? actorId ?? null, verb, targetType: "Application", targetId: app.id, note: note ?? null } });

  // --- SALES: collect a document manually ---
  if (action === "collectDoc") {
    const d = docs.find((x) => x.key === body.docKey);
    if (d && d.status !== "RECEIVED") {
      d.status = "RECEIVED"; d.via = "SALES"; d.at = now.toISOString();
      await db.application.update({ where: { id: app.id }, data: { docs: JSON.stringify(docs) } });
      await event("collected document from customer", d.label);
    }
    return NextResponse.json({ ok: true });
  }

  // --- SALES: submit to underwriting → L1 AI scrutiny runs synchronously ---
  if (action === "submit") {
    if (docs.some((d) => d.status !== "RECEIVED")) {
      return NextResponse.json({ error: "documents incomplete" }, { status: 400 });
    }
    const scrutiny = runAiScrutiny({ panName: app.customer.panName, aadhaarName: app.customer.aadhaarName, sumAssured: app.sumAssured, incomeAnnual: app.customer.incomeAnnual, docs });
    caseFile.aiScrutiny = { ...scrutiny, at: now.toISOString() };
    caseFile.hlv = app.customer.incomeAnnual ? app.customer.incomeAnnual * 15 : null;
    caseFile.aggregateCover = app.sumAssured;
    caseFile.authorityBand = authorityBandFor(app.sumAssured, false);
    // tele-MER auto-booked for cover above ₹50L
    if (app.sumAssured > 50_00_000 && !caseFile.teleMer) {
      caseFile.teleMer = { status: "SCHEDULED", scheduledAt: now.toISOString(), report: null };
      await event("tele-MER auto-booked with TPA vendor", "slot confirmed");
    }
    await event(`submitted to underwriting — ${docs.length}/${docs.length} documents`);

    if (scrutiny.result === "FLAGS") {
      sendBacks.push({ id: `sb-${Date.now()}`, level: "AI", reasons: scrutiny.notes, note: "Raised automatically at AI scrutiny.", status: "OPEN", at: now.toISOString() });
      await db.application.update({ where: { id: app.id }, data: { status: "SENT_BACK", sentBackTo: "AI", submittedAt: now, stageChangedAt: now, caseFile: JSON.stringify(caseFile), sendBacks: JSON.stringify(sendBacks) } });
      await event(`AI scrutiny — ${scrutiny.notes.length} flags, sent back to sales`, scrutiny.notes[0], null);
      await notify(app.ownerId, `AI scrutiny sent back ${app.customer.name} — ${scrutiny.notes[0]}`, `/case?id=${app.id}`);
      return NextResponse.json({ ok: true, next: { stage: "SENT_BACK", holder: "You (sales)", message: "AI scrutiny raised flags — resolve and resubmit." } });
    }

    await db.application.update({ where: { id: app.id }, data: { status: "ANALYST_REVIEW", submittedAt: now, stageChangedAt: now, caseFile: JSON.stringify(caseFile) } });
    await event("AI scrutiny passed — moved to Risk Ops", scrutiny.notes.join(" · "), null);
    const analyst = app.analystId ? await db.persona.findUnique({ where: { id: app.analystId } }) : null;
    await notify(app.analystId, `New case for review — ${app.customer.name} (${app.refNo}), AI scrutiny passed`, `/case?id=${app.id}`);
    return NextResponse.json({ ok: true, next: { stage: "ANALYST_REVIEW", holder: analyst?.name ?? "Risk Ops", message: `AI scrutiny passed. Now with ${analyst?.name ?? "the Risk Ops team"} for verification.` } });
  }

  // --- ANALYST (L2): verify & forward ---
  if (action === "forward") {
    caseFile.analystNote = body.note?.trim() || "Case file verified — income, HLV and aggregate cover checked. Within band.";
    await db.application.update({ where: { id: app.id }, data: { status: "UW_REVIEW", stageChangedAt: now, caseFile: JSON.stringify(caseFile) } });
    await event("verified case file & forwarded to underwriter", caseFile.analystNote ?? undefined);
    const uwP = app.underwriterId ? await db.persona.findUnique({ where: { id: app.underwriterId } }) : null;
    await notify(app.underwriterId, `Case verified & forwarded to you — ${app.customer.name} (${app.refNo})`, `/case?id=${app.id}`);
    return NextResponse.json({ ok: true, next: { stage: "UW_REVIEW", holder: uwP?.name ?? "Underwriter", message: `Forwarded. Now with ${uwP?.name ?? "the underwriter"} for decision.` } });
  }

  // --- ANALYST / UW: send back to sales ---
  if (action === "sendBack") {
    const level = body.level === "ANALYST" ? "ANALYST" : "UW";
    const reasons: string[] = body.reasons ?? [];
    if (!reasons.length) return NextResponse.json({ error: "select at least one reason" }, { status: 400 });
    sendBacks.push({ id: `sb-${Date.now()}`, level, reasons, note: body.note?.trim() || null, status: "OPEN", at: now.toISOString() });
    await db.application.update({ where: { id: app.id }, data: { status: "SENT_BACK", sentBackTo: level, stageChangedAt: now, sendBacks: JSON.stringify(sendBacks) } });
    const owner = app.ownerId ? await db.persona.findUnique({ where: { id: app.ownerId } }) : null;
    await event(`sent back to sales — ${reasons.length} item${reasons.length > 1 ? "s" : ""}`, reasons.join(" · "));
    await notify(app.ownerId, `${level === "UW" ? "Underwriter" : "Risk Ops"} sent back ${app.customer.name} — ${reasons[0]}${reasons.length > 1 ? ` (+${reasons.length - 1} more)` : ""}`, `/case?id=${app.id}`);
    return NextResponse.json({ ok: true, next: { stage: "SENT_BACK", holder: owner?.name ?? "Sales", message: `Sent back to ${owner?.name ?? "sales"} — appears in their queue now.` } });
  }

  // --- UW: request additional info directly from the customer (not sales) ---
  if (action === "uwRequestInfo") {
    caseFile.uwRequest = { status: "received", label: "Customer data pull", at: now.toISOString(), data: "Requested via customer portal — medical & financial confirmations received." };
    await db.application.update({ where: { id: app.id }, data: { caseFile: JSON.stringify(caseFile) } });
    await event("underwriter requested additional info from customer", "medical & financial — received via portal");
    return NextResponse.json({ ok: true, next: { message: "Requested from the customer — data received. Ready to decide." } });
  }

  // --- SALES: resolve send-back → returns to the level that asked ---
  if (action === "resolveSendBack") {
    const open = sendBacks.find((s) => s.status === "OPEN");
    if (!open) return NextResponse.json({ error: "no open send-back" }, { status: 400 });
    open.status = "RESOLVED";
    open.resolvedNote = body.note?.trim() || "Information provided.";
    open.resolvedAt = now.toISOString();
    let nextStatus = "UW_REVIEW";
    let holderName = "Underwriter";
    if (open.level === "AI") {
      // AI re-scrutiny: resolved means deficiencies addressed → pass forward to analyst
      caseFile.aiScrutiny = { result: "PASS", notes: ["Deficiencies resolved by sales — re-scrutiny clear"], at: now.toISOString() };
      nextStatus = "ANALYST_REVIEW";
    } else if (open.level === "ANALYST") {
      nextStatus = "ANALYST_REVIEW";
    }
    await db.application.update({ where: { id: app.id }, data: { status: nextStatus, sentBackTo: null, stageChangedAt: now, sendBacks: JSON.stringify(sendBacks), caseFile: JSON.stringify(caseFile) } });
    const holder = nextStatus === "ANALYST_REVIEW"
      ? (app.analystId ? await db.persona.findUnique({ where: { id: app.analystId } }) : null)
      : (app.underwriterId ? await db.persona.findUnique({ where: { id: app.underwriterId } }) : null);
    holderName = holder?.name ?? holderName;
    await event("resolved send-back — returned to " + (open.level === "UW" ? "underwriter" : "Risk Ops"), open.resolvedNote ?? undefined);
    await notify(nextStatus === "ANALYST_REVIEW" ? app.analystId : app.underwriterId, `Send-back resolved by sales — ${app.customer.name} back in your queue`, `/case?id=${app.id}`);
    return NextResponse.json({ ok: true, next: { stage: nextStatus, holder: holderName, message: `Returned to ${holderName} — picks up where it left off.` } });
  }

  // --- UW (L3): issue ---
  if (action === "issue") {
    await db.application.update({ where: { id: app.id }, data: { status: "ISSUED", stageChangedAt: now } });
    // the policy is born — the book grows
    await db.policy.create({
      data: {
        policyNo: `0312 ${String(Math.abs(hashCode(app.id)) % 9000 + 1000)} ${String(Math.abs(hashCode(app.refNo)) % 9000 + 1000)}`,
        customerId: app.customerId, product: app.product, plan: app.plan, status: "IN_FORCE",
        issueDate: now.toISOString().slice(0, 10), premium: app.premium, mode: "ANNUAL",
        sumAssured: app.sumAssured, advisorId: app.ownerId,
      },
    });
    await event("cleared & issued policy", `${app.refNo} · ${app.customer.name}`);
    await notify(app.ownerId, `Policy issued — ${app.customer.name} (${app.refNo})`, `/case?id=${app.id}`);
    return NextResponse.json({ ok: true, next: { stage: "ISSUED", holder: null, message: "Policy issued — now in the customer's book." } });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
  return h;
}
