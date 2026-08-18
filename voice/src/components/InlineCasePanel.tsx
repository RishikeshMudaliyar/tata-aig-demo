"use client";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { fetcher, action } from "@/lib/ui";
import { inr, isSeller } from "@/lib/domain";
import { SectionTitle } from "@/components/bits";
import { ArrowRight, Check, Upload, Smartphone, Send, Undo2, Lock, Stethoscope, FileCheck2, Bot, RotateCcw, Camera, X, AlertTriangle, Database, ShieldCheck } from "lucide-react";

const REASONS = [
  "Income proof missing / unclear",
  "KYC name mismatch (PAN vs Aadhaar)",
  "Aggregate-cover clarification needed",
  "Medical information needed",
  "Nominee / bank details incomplete",
  "Other — see note",
];

const JOURNEY = [
  { key: "LEAD", label: "Lead" },
  { key: "DOC_COLLECTION", label: "Documents" },
  { key: "AI", label: "AI scrutiny" },
  { key: "ANALYST_REVIEW", label: "Risk Ops" },
  { key: "UW_REVIEW", label: "Underwriter" },
  { key: "ISSUED", label: "Issued" },
];
function stageIndex(status: string, sentBackTo: string | null): number {
  switch (status) {
    case "DOC_COLLECTION": return 1;
    case "ANALYST_REVIEW": return 3;
    case "UW_REVIEW": return 4;
    case "ISSUED": return 5;
    case "SENT_BACK": return sentBackTo === "AI" ? 2 : sentBackTo === "ANALYST" ? 3 : 4;
    default: return 1;
  }
}

/**
 * The role-aware case work-surface — the single source of truth for a case,
 * used both embedded in every role's split-view cockpit and by the standalone
 * /case page. Renders the action for whoever holds the baton; everyone else sees
 * a read-only "with X" note.
 */
export function InlineCasePanel({ applicationId, personaId, role, onChanged, showReset }: { applicationId: string; personaId?: string; role?: string; onChanged?: () => void; showReset?: boolean }) {
  const { data, mutate } = useSWR<{ case: any }>(`/api/case?id=${applicationId}`, fetcher, { refreshInterval: 3000 });
  const [busy, setBusy] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [sbNote, setSbNote] = useState("");
  const [capture, setCapture] = useState<{ key: string; label: string } | null>(null);

  if (!data?.case) return <div className="card p-6 text-sm" style={{ color: "var(--muted)" }}>Loading case…</div>;
  const c = data.case;
  const docs: any[] = c.docsParsed ?? [];
  const cf = c.caseFileParsed ?? {};
  const sendBacks: any[] = c.sendBacksParsed ?? [];
  const openSB = sendBacks.find((s: any) => s.status === "OPEN");
  const gotDocs = docs.filter((d) => d.status === "RECEIVED").length;
  const idx = stageIndex(c.status, c.sentBackTo);

  const isSales = isSeller(role) && personaId === c.ownerId;
  const isAnalyst = role === "ANALYST" && personaId === c.analystId;
  const isUW = role === "UNDERWRITER" && personaId === c.underwriterId;
  const hasCaseFile = !!(cf.aiScrutiny || cf.hlv || cf.teleMer || cf.analystNote);

  // Analyst view: the checks AI ran, and what it flagged for a human to verify.
  const ANALYST_CHECKS = ["PAN ↔ Aadhaar", "Document completeness", "Cover vs income grid", "Aggregation / duplicate policy", "Sanctions / PEP", "Age-proof validity", "Signature & mandate"];
  const aiFlags: string[] = cf.aiScrutiny?.result === "FLAGS" && cf.aiScrutiny.notes?.length
    ? cf.aiScrutiny.notes
    : ["Income-proof legibility — confirm the ITR scan is readable", "Nominee relationship — confirm it matches the proposal"];

  // Underwriter view: evidence pulled from Tata AIG + external systems.
  const uwEvidence = [
    { label: "Medical (TPA tele-MER)", value: cf.teleMer?.status === "COMPLETED" ? (cf.teleMer.report ?? "completed") : cf.teleMer?.status === "SCHEDULED" ? "booked with TPA — report pending" : "not required on grid" },
    { label: "Financial (income / HLV)", value: cf.hlv ? `Income verified · HLV ceiling ${inr(cf.hlv)}` : "income verified" },
    { label: "Existing cover (CKYC / MIB)", value: cf.aggregateCover ? `Aggregate ${inr(cf.aggregateCover)}${cf.hlv && cf.aggregateCover > cf.hlv ? " · exceeds HLV" : " · within HLV"}` : "no other cover found" },
    { label: "Bureau (CIBIL / identity)", value: "No adverse records · identity confirmed" },
  ];

  const run = async (act: string, extra: Record<string, unknown> = {}) => {
    setBusy(act);
    const res = await action("/api/case", { applicationId: c.id, action: act, actorId: personaId, ...extra });
    setBusy(null);
    if (res.next?.message) setHandoff(res.next.message);
    setResolveNote(""); setPicked([]); setSbNote("");
    await mutate();
    onChanged?.();
  };

  return (
    <div className="grid gap-4 content-start">
      {/* Header */}
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="display-md" style={{ color: "var(--navy)" }}>{c.customer.name}</h2>
            <div className="text-sm tnum mt-0.5" style={{ color: "var(--muted)" }}>
              {c.product} · {inr(c.sumAssured)} cover · {inr(c.premium)}/yr · {c.refNo}
            </div>
          </div>
          <span className="chip">{c.status === "SENT_BACK" ? "Sent back to sales" : c.status === "ISSUED" ? "Issued" : c.status === "DOC_COLLECTION" ? "Collecting documents" : c.status === "ANALYST_REVIEW" ? "With Risk Ops" : "With underwriter"}</span>
        </div>
      </div>

      {/* Journey */}
      <div className="card p-4 overflow-x-auto scrollbar-thin">
        <div className="flex items-center gap-1 min-w-max">
          {JOURNEY.map((s, i) => {
            const done = i < idx || c.status === "ISSUED";
            const current = i === idx && c.status !== "ISSUED";
            return (
              <div key={s.key} className="flex items-center gap-1">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
                  style={{ background: done ? "#e2f4e8" : current ? "#e8f2fb" : "#eef2f6", color: done ? "var(--good)" : current ? "var(--brand)" : "var(--muted)", fontWeight: current ? 500 : 400 }}>
                  {done ? <Check size={12} /> : null}{s.label}
                </div>
                {i < JOURNEY.length - 1 && <div className="w-3 h-px" style={{ background: "var(--line)" }} />}
              </div>
            );
          })}
        </div>
      </div>

      {handoff && (
        <div className="p-3 rounded-lg text-sm flex items-center gap-2 slide-in" style={{ background: "#e2f4e8", color: "var(--good)" }}>
          <Check size={16} /> {handoff}
        </div>
      )}

      {/* Case file — only when there's something beyond the doc checklist */}
      {hasCaseFile && (
        <div className="card p-4">
          <SectionTitle>Case file</SectionTitle>
          <div className="grid gap-2.5 text-sm">
            {cf.aiScrutiny && (
              <Row icon={<Bot size={15} />} label="AI scrutiny">
                <span style={{ color: cf.aiScrutiny.result === "PASS" ? "var(--good)" : "var(--warn)" }}>{cf.aiScrutiny.result === "PASS" ? "Passed" : `${cf.aiScrutiny.notes.length} flags`}</span>
                <div className="mt-0.5" style={{ color: "var(--muted)" }}>{cf.aiScrutiny.notes.map((n: string, i: number) => <div key={i}>· {n}</div>)}</div>
              </Row>
            )}
            {cf.hlv ? (
              <Row icon={<FileCheck2 size={15} />} label="Financials">
                <span className="tnum">HLV {inr(cf.hlv)} · aggregate {inr(cf.aggregateCover ?? 0)}</span>
                {cf.authorityBand && <div style={{ color: "var(--muted)" }}>{cf.authorityBand}</div>}
              </Row>
            ) : null}
            {cf.teleMer && (
              <Row icon={<Stethoscope size={15} />} label="Tele-MER">
                {cf.teleMer.status === "SCHEDULED" ? <span style={{ color: "var(--brand)" }}>Booked with TPA — report attaches automatically</span>
                  : cf.teleMer.status === "COMPLETED" ? <span style={{ color: "var(--muted)" }}>{cf.teleMer.report}</span> : "Not required"}
              </Row>
            )}
            {cf.analystNote && (
              <Row icon={<FileCheck2 size={15} />} label="Analyst note"><span style={{ color: "var(--muted)" }}>{cf.analystNote}</span></Row>
            )}
          </div>
        </div>
      )}

      {/* SALES: document collection */}
      {c.status === "DOC_COLLECTION" && (
        <div className="card p-4">
          <SectionTitle hint={`${gotDocs}/${docs.length}`}>Documents</SectionTitle>
          <div className="grid gap-2 mb-3">
            {docs.map((d) => (
              <div key={d.key} className="flex items-center justify-between gap-2 p-2.5 rounded-lg border" style={{ borderColor: "var(--line)" }}>
                <div className="text-sm font-medium">{d.label}</div>
                {d.status === "RECEIVED" ? (
                  <span className="chip" style={{ background: "#e2f4e8", color: "var(--good)", borderColor: "transparent" }}>
                    {d.via === "CUSTOMER" ? <Smartphone size={11} /> : <Upload size={11} />} {d.via === "CUSTOMER" ? "customer uploaded" : "collected by you"}
                  </span>
                ) : isSales ? (
                  <div className="flex gap-1.5">
                    <button className="btn btn-sm" disabled={busy !== null} onClick={() => setCapture({ key: d.key, label: d.label })}><Camera size={13} /> Capture</button>
                    <button className="btn btn-sm btn-ghost" style={{ color: "var(--muted)" }} disabled={busy !== null} onClick={() => run("collectDoc", { docKey: d.key })} title="Upload from files"><Upload size={13} /></button>
                  </div>
                ) : <span className="chip">awaiting</span>}
              </div>
            ))}
          </div>
          {isSales ? (
            <button className="btn btn-primary w-full justify-between" disabled={busy !== null || gotDocs < docs.length} onClick={() => run("submit")}>
              <span className="flex items-center gap-2"><Send size={16} />{busy === "submit" ? "Submitting…" : gotDocs < docs.length ? `Waiting on ${docs.length - gotDocs} document${docs.length - gotDocs > 1 ? "s" : ""}` : "Submit to underwriting"}</span>
              <ArrowRight size={16} />
            </button>
          ) : <LockedNote text={`Sales action — with ${c.owner?.name ?? "the salesperson"}`} />}
        </div>
      )}

      {/* SALES: resolve send-back */}
      {c.status === "SENT_BACK" && openSB && (
        <div className="card p-4">
          <SectionTitle>Sent back by {openSB.level === "AI" ? "AI scrutiny" : openSB.level === "ANALYST" ? "Risk Ops" : "underwriter"}</SectionTitle>
          <div className="grid gap-1.5 mb-2">
            {openSB.reasons.map((r: string, i: number) => (<div key={i} className="p-2.5 rounded-lg text-sm" style={{ background: "#fdf3e3" }}>{r}</div>))}
          </div>
          {openSB.note && <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>“{openSB.note}”</p>}
          {isSales ? (
            <>
              <textarea className="w-full text-sm p-2.5 rounded-lg border mb-2" style={{ borderColor: "var(--hairline-input)", background: "#fff" }} rows={2}
                placeholder="What you collected / clarified…" value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} />
              <button className="btn btn-primary w-full justify-between" disabled={busy !== null} onClick={() => run("resolveSendBack", { note: resolveNote })}>
                <span className="flex items-center gap-2"><Check size={16} />{busy === "resolveSendBack" ? "Returning…" : `Provide info — return to ${openSB.level === "UW" ? "underwriter" : "Risk Ops"}`}</span>
                <ArrowRight size={16} />
              </button>
            </>
          ) : <LockedNote text={`Sales action — with ${c.owner?.name ?? "the salesperson"}`} />}
        </div>
      )}

      {/* ANALYST: AI-assisted review — checks are done; verify the flags, forward or bounce */}
      {c.status === "ANALYST_REVIEW" && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bot size={15} style={{ color: "var(--brand)" }} />
            <span className="micro-cap" style={{ color: "var(--ink-mute)" }}>Risk Ops · AI-assisted</span>
          </div>
          <div className="p-3 rounded-lg mb-3" style={{ background: "#e8f2fb" }}>
            <div className="text-sm font-medium" style={{ color: "var(--brand)" }}>{ANALYST_CHECKS.length} automated checks run on this file</div>
            <div className="text-[12px] mt-0.5" style={{ color: "var(--muted)" }}>{ANALYST_CHECKS.join(" · ")}</div>
          </div>
          <div className="micro-cap mb-1.5" style={{ color: "var(--warn)" }}>AI flagged {aiFlags.length} for you to verify</div>
          <div className="grid gap-1.5 mb-3">
            {aiFlags.map((f: string, i: number) => (
              <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg text-sm" style={{ background: "#fdf3e3" }}>
                <AlertTriangle size={14} style={{ color: "var(--warn)", marginTop: 2 }} className="shrink-0" /><span>{f}</span>
              </div>
            ))}
          </div>
          {isAnalyst ? (
            <>
              <button className="btn btn-primary w-full justify-between mb-3" disabled={busy !== null} onClick={() => run("forward")}>
                <span className="flex items-center gap-2"><Check size={16} />{busy === "forward" ? "Forwarding…" : "Verified — forward to underwriter"}</span>
                <ArrowRight size={16} />
              </button>
              <SendBackPicker picked={picked} setPicked={setPicked} note={sbNote} setNote={setSbNote} busy={busy} onSend={() => run("sendBack", { level: "ANALYST", reasons: picked, note: sbNote })} />
            </>
          ) : <LockedNote text={`Analyst action — with ${c.analyst?.name ?? "the Risk Ops team"}`} />}
        </div>
      )}

      {/* UW: decide on the evidence — data pulled from Tata AIG & external systems (no bounce to sales) */}
      {c.status === "UW_REVIEW" && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck size={15} style={{ color: "var(--brand)" }} />
            <span className="micro-cap" style={{ color: "var(--ink-mute)" }}>Underwriter · decision on the evidence</span>
          </div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Database size={12} style={{ color: "var(--muted)" }} />
            <span className="micro-cap" style={{ color: "var(--muted)" }}>Pulled from Tata AIG PAS · CKYC · CIBIL · TPA medical</span>
          </div>
          <div className="grid gap-1.5 mb-3">
            {uwEvidence.map((e, i) => (
              <div key={i} className="flex items-center justify-between gap-2 p-2.5 rounded-lg" style={{ background: "var(--canvas-soft)" }}>
                <div className="min-w-0">
                  <div className="text-sm font-medium">{e.label}</div>
                  <div className="text-[12px]" style={{ color: "var(--muted)" }}>{e.value}</div>
                </div>
                <span className="chip shrink-0" style={{ background: "#e2f4e8", color: "var(--good)", borderColor: "transparent" }}><Check size={11} /> pulled</span>
              </div>
            ))}
          </div>
          {isUW ? (
            <>
              <button className="btn btn-primary w-full justify-between mb-2" disabled={busy !== null} onClick={() => run("issue")}>
                <span className="flex items-center gap-2"><Check size={16} />{busy === "issue" ? "Issuing…" : "Clear & issue policy"}</span>
                <ArrowRight size={16} />
              </button>
              <button className="btn w-full justify-center" disabled={busy !== null} onClick={() => run("uwRequestInfo")}>
                <Database size={15} /> {busy === "uwRequestInfo" ? "Requesting…" : "Request additional info from customer"}
              </button>
            </>
          ) : <LockedNote text={`Underwriter action — with ${c.underwriter?.name ?? "the underwriter"}`} />}
        </div>
      )}

      {capture && (
        <CaptureSheet label={capture.label} onClose={() => setCapture(null)}
          onCaptured={async () => { const k = capture.key; setCapture(null); await run("collectDoc", { docKey: k }); }} />
      )}

      {c.status === "ISSUED" && (
        <div className="card p-4">
          <div className="p-3 rounded-lg text-sm font-semibold flex items-center gap-2" style={{ background: "#e2f4e8", color: "var(--good)" }}>
            <Check size={18} /> Policy issued — now in {c.customer.name.split(" ")[0]}&apos;s book.
          </div>
          {showReset && c.leadId && (
            <button className="btn btn-sm btn-ghost mt-3" style={{ color: "var(--muted)" }} disabled={busy !== null}
              onClick={async () => { setBusy("reset"); await action("/api/leads", { leadId: c.leadId, action: "resetJourney" }); window.location.href = "/cockpit"; }}>
              <RotateCcw size={13} /> Reset journey (demo)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Simulated document camera — viewfinder → shutter → scan → attached. Presentable in a resized tab. */
function CaptureSheet({ label, onClose, onCaptured }: { label: string; onClose: () => void; onCaptured: () => void }) {
  const [scanning, setScanning] = useState(false);
  useEffect(() => {
    if (!scanning) return;
    const t = setTimeout(onCaptured, 1300);
    return () => clearTimeout(t);
  }, [scanning, onCaptured]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col fade-in" style={{ background: "rgba(9,20,30,0.92)" }}>
      <div className="flex items-center justify-between px-4 h-14 shrink-0" style={{ color: "#fff" }}>
        <span className="text-sm" style={{ opacity: 0.85 }}>Capture · {label}</span>
        <button onClick={onClose} disabled={scanning} style={{ color: "#fff", opacity: scanning ? 0.4 : 0.9 }}><X size={22} /></button>
      </div>
      {/* viewfinder */}
      <div className="flex-1 grid place-items-center px-8">
        <div className="relative w-full" style={{ maxWidth: 320, aspectRatio: "1.4 / 1", borderRadius: 14, background: "rgba(255,255,255,0.06)" }}>
          {[[0, 0], [0, 1], [1, 0], [1, 1]].map(([r, c], i) => (
            <span key={i} style={{ position: "absolute", width: 26, height: 26, [r ? "bottom" : "top"]: 10, [c ? "right" : "left"]: 10, [r ? "borderBottom" : "borderTop"]: "3px solid #fff", [c ? "borderRight" : "borderLeft"]: "3px solid #fff", borderRadius: 3, opacity: 0.9 } as React.CSSProperties} />
          ))}
          <div className="absolute inset-0 grid place-items-center text-center" style={{ color: "rgba(255,255,255,0.75)" }}>
            {scanning
              ? <div className="flex flex-col items-center gap-2"><div className="pulse-dot" style={{ width: 12, height: 12 }} /><span className="text-sm">Scanning {label}…</span></div>
              : <span className="text-sm">Align the {label} within the frame</span>}
          </div>
        </div>
      </div>
      {/* shutter */}
      <div className="grid place-items-center pb-10 shrink-0">
        <button aria-label="Capture" disabled={scanning} onClick={() => setScanning(true)}
          className="grid place-items-center rounded-full" style={{ width: 68, height: 68, background: "#fff", opacity: scanning ? 0.5 : 1, boxShadow: "0 0 0 4px rgba(255,255,255,0.35)" }}>
          <Camera size={26} style={{ color: "var(--brand)" }} />
        </button>
      </div>
    </div>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span style={{ color: "var(--brand)", marginTop: 2 }} className="shrink-0">{icon}</span>
      <div className="flex-1"><span className="font-medium">{label}: </span><span>{children}</span></div>
    </div>
  );
}

function LockedNote({ text }: { text: string }) {
  return <div className="btn w-full justify-start" style={{ opacity: 0.55, cursor: "default" }}><Lock size={15} /> {text}</div>;
}

function SendBackPicker({ picked, setPicked, note, setNote, busy, onSend }: {
  picked: string[]; setPicked: (v: string[]) => void; note: string; setNote: (v: string) => void; busy: string | null; onSend: () => void;
}) {
  const toggle = (r: string) => setPicked(picked.includes(r) ? picked.filter((x) => x !== r) : [...picked, r]);
  return (
    <div className="pt-3" style={{ borderTop: "1px solid var(--hairline)" }}>
      <div className="micro-cap mb-2" style={{ color: "var(--muted)" }}>Something missing? Send back to sales</div>
      <div className="grid gap-1.5 mb-2">
        {REASONS.map((r) => (
          <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={picked.includes(r)} onChange={() => toggle(r)} /> {r}
          </label>
        ))}
      </div>
      <textarea className="w-full text-sm p-2.5 rounded-lg border mb-2" style={{ borderColor: "var(--hairline-input)", background: "#fff" }} rows={2}
        placeholder="Note for the salesperson (optional)…" value={note} onChange={(e) => setNote(e.target.value)} />
      <button className="btn btn-accent w-full justify-between" disabled={busy !== null || picked.length === 0} onClick={onSend}>
        <span className="flex items-center gap-2"><Undo2 size={15} />{busy === "sendBack" ? "Sending…" : `Send back to sales (${picked.length})`}</span>
      </button>
    </div>
  );
}
