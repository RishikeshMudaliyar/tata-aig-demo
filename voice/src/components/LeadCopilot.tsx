"use client";
import { VoiceAgentButton } from "@/components/VoiceAgent";
import { useState } from "react";
import { action } from "@/lib/ui";
import { inr } from "@/lib/domain";
import { SectionTitle } from "@/components/bits";
import { useIsMobile } from "@/lib/useIsMobile";
import { quoteOptions, commissionRate, isTermPlan, ROP_MULTIPLIER, incentiveLadder, earnedStages } from "@/lib/quote";
import { scoringReasons, LEAD_TYPES } from "@/lib/leadTypes";
import { ArrowRight, Check, PhoneOff, Clock, Sparkles, Phone, MessageCircle, ChevronDown, FileText, Wallet, Cpu } from "lucide-react";

type Copilot = {
  type?: string;
  whyScored?: string[];
  product?: string; cover?: number; premium?: number; term?: string;
  talkTrack?: string;
  objections?: { q: string; a: string }[];
};

/**
 * The AI copilot for a single lead — why it scored, the recommended pitch,
 * talk-track, objection handling, and the call outcomes. Shared by the
 * split-view sales workspace and the standalone /lead page.
 */
export function LeadCopilot({
  lead, canAct, personaId, onConverted,
}: {
  lead: any;
  canAct: boolean;
  personaId?: string;
  onConverted?: (applicationId: string) => void;
}) {
  const cp: Copilot = lead.copilotParsed ?? {};
  const isMobile = useIsMobile();
  const [busy, setBusy] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<string | null>(null);
  const [showObjections, setShowObjections] = useState(false);
  const [rop, setRop] = useState(false);
  const [acted, setActed] = useState<string | null>(lead.status === "CALLBACK" ? "callback" : lead.status === "CLOSED" ? "closed" : null);

  // Quotation, generated from the recommended anchor + lead profile
  const cover = cp.cover ?? 1_00_00_000;
  const premium = cp.premium ?? 15000;
  const product = cp.product ?? lead.productInterest ?? "";
  const term = isTermPlan(product);
  const ropMult = rop && term ? ROP_MULTIPLIER : 1;
  const options = quoteOptions(cover, premium);
  const coverMultiple = lead.incomeAnnual ? Math.round(cover / lead.incomeAnnual) : null;

  // Type-based scoring rationale (falls back to any seeded reasons)
  const typeMeta = cp.type ? LEAD_TYPES[cp.type] : undefined;
  const reasons = cp.type ? scoringReasons(cp.type, lead.incomeAnnual, lead.productInterest) : (cp.whyScored ?? []);

  // Staged incentive ladder
  const ladder = incentiveLadder(product, Math.round(premium * ropMult));
  const earned = earnedStages(lead.status);
  const potential = ladder.filter((s) => !s.trail).reduce((sum, s) => sum + s.amount, 0);

  const digits = (lead.phone ?? "").replace(/\D/g, "");
  const waText = encodeURIComponent(
    `Hi ${lead.name?.split(" ")[0] ?? ""}, sharing a quick summary: ${cp.product ?? "a plan"}${cp.cover ? ` — ${inr(cp.cover)} cover` : ""}${cp.premium ? ` at ${inr(cp.premium)}/yr` : ""}. Shall I proceed?`
  );

  const outcome = async (act: string) => {
    setBusy(act);
    const res = await action("/api/leads", { leadId: lead.id, action: act, actorId: personaId });
    setBusy(null);
    if (act === "interested" && res.applicationId) {
      onConverted?.(res.applicationId);
      return;
    }
    setHandoff(res.next?.message ?? "Done.");
    setActed(act);
  };

  const closed = lead.status === "CLOSED";

  return (
    <div className="grid gap-4 content-start">
      {/* Who */}
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="display-md" style={{ color: "var(--navy)" }}>{lead.name}</h1>
            <div className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
              {lead.occupation} · {lead.city}{lead.incomeAnnual ? <span className="tnum"> · income {inr(lead.incomeAnnual)}/yr</span> : null}
            </div>
            <div className="text-sm" style={{ color: "var(--muted)" }}>{lead.source} · asked about {lead.productInterest?.toLowerCase()}</div>
          </div>
          <span className="chip tnum">score {lead.score}</span>
        </div>
        {/* quick actions — call, WhatsApp, or hand the whole conversation to AI */}
        {canAct && digits && (
          <>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <a href={`tel:${digits}`} className="btn btn-accent justify-center"><Phone size={15} /> Call</a>
              <a href={`https://wa.me/${digits}?text=${waText}`} target="_blank" rel="noreferrer" className="btn justify-center" style={{ color: "#0c8934", borderColor: "#bfe6cb" }}><MessageCircle size={15} /> WhatsApp</a>
            </div>
            {/* Live agents — both run in the browser over WebRTC. */}
            <VoiceAgentButton
              kind="QUALIFIER"
              /* The delegation stage shows the CUSTOMER's handset, so this is the lead.
                 Riya's own name is fixed inside DelegationCall. */
              personName={lead.name ?? "Customer"}
              personRole="Customer"
              gender="female"
              leadPhone={lead.phone ?? ""}
              salespersonName="Vikram Singh"
              label={`Delegate to AI — let Riya call ${lead.name?.split(" ")[0]}`}
              contextNote={`Riya will qualify ${lead.name} on ${lead.productInterest?.toLowerCase() ?? "their enquiry"} from ${lead.source}. For this demo you play the customer.`}
              /* Injected per call — this is what makes Riya open with the right name,
                 product and salesperson instead of a generic script. */
              variables={{
                lead_name: lead.name ?? "",
                lead_source: lead.source ?? "",
                product_interest: lead.productInterest ?? "",
                salesperson_name: "Vikram Singh",
                city: lead.city ?? "",
              }}
              className="btn w-full justify-center mt-2"
              style={{ background: "#f3f0ff", color: "#6b4fd8", borderColor: "#d9d0f7" }}
            />
          </>
        )}
      </div>

      {/* Why this lead — reasoned from the lead TYPE + profile */}
      {reasons.length ? (
        <div className="card p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <SectionTitle>Why this lead scored {lead.score}</SectionTitle>
            {typeMeta && <span className="chip" style={{ background: "#e8f2fb", color: "var(--brand)", borderColor: "transparent" }}>{typeMeta.label} · {typeMeta.intent} intent</span>}
          </div>
          <div className="grid gap-1.5">
            {reasons.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-sm"><Sparkles size={14} style={{ color: "var(--brand)", marginTop: 3 }} className="shrink-0" /><span>{w}</span></div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Recommended pitch */}
      <div className="card p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <SectionTitle>Recommended pitch</SectionTitle>
          <span className="chip" style={{ background: "var(--canvas-soft)", color: "var(--muted)", borderColor: "transparent" }}><Cpu size={11} /> Bajaj product-match engine</span>
        </div>
        <div className="p-3 rounded-lg mb-3" style={{ background: "#e8f2fb" }}>
          <div className="font-semibold text-sm">{cp.product ?? "Bajaj Allianz Life Smart Protect Goal"}</div>
          <div className="text-sm tnum" style={{ color: "var(--ink-secondary)" }}>
            {cp.cover ? `${inr(cp.cover)} cover` : ""}{cp.premium ? ` · ${inr(cp.premium)}/yr` : ""}{cp.term ? ` · ${cp.term}` : ""}
          </div>
        </div>
        {cp.talkTrack && (
          <>
            <div className="micro-cap mb-1" style={{ color: "var(--muted)" }}>Talk-track</div>
            <p className="text-sm leading-relaxed mb-3">{cp.talkTrack}</p>
          </>
        )}
        {cp.objections?.length ? (
          <>
            <button className="flex items-center justify-between w-full" onClick={() => setShowObjections((v) => !v)}>
              <span className="micro-cap" style={{ color: "var(--muted)" }}>Objection handling · {cp.objections.length}</span>
              <ChevronDown size={15} style={{ color: "var(--muted)", transform: showObjections ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </button>
            {showObjections && (
              <div className="grid gap-2 mt-2 fade-in">
                {cp.objections.map((o, i) => (
                  <div key={i} className="p-2.5 rounded-lg text-sm" style={{ background: "var(--canvas-soft)" }}>
                    <div className="font-medium">“{o.q}”</div>
                    <div style={{ color: "var(--ink-secondary)" }}>{o.a}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Quotation — generated from this lead's profile */}
      <div className="card p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <FileText size={15} style={{ color: "var(--brand)" }} />
            <span className="micro-cap" style={{ color: "var(--ink-mute)" }}>Quotation</span>
            <span className="chip" style={{ background: "var(--canvas-soft)", color: "var(--muted)", borderColor: "transparent" }}><Cpu size={10} /> Bajaj rating API</span>
          </div>
          {term && (
            <button className="chip" style={{ cursor: "pointer", background: rop ? "#e8f2fb" : "var(--canvas-soft)", color: rop ? "var(--brand)" : "var(--muted)", borderColor: "transparent" }} onClick={() => setRop((v) => !v)}>
              {rop ? <Check size={11} /> : null} Return of premium
            </button>
          )}
        </div>
        <p className="text-[12px] mb-3" style={{ color: "var(--muted)" }}>
          Generated from {lead.incomeAnnual ? <>income {inr(lead.incomeAnnual)}/yr{coverMultiple ? ` (~${coverMultiple}× cover)` : ""}</> : "the lead profile"}{cp.term ? ` · ${cp.term}` : ""}.
        </p>
        <div className="grid gap-1.5">
          {options.map((o) => {
            const annual = Math.round((o.annual * ropMult) / 100) * 100;
            return (
              <div key={o.cover} className="flex items-center justify-between gap-2 p-2.5 rounded-lg"
                style={{ background: o.recommended ? "#e8f2fb" : "var(--canvas-soft)", outline: o.recommended ? "1.5px solid var(--brand)" : "none" }}>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm tnum">{inr(o.cover)}</span>
                  {o.recommended && <span className="chip" style={{ background: "var(--brand)", color: "#fff", borderColor: "transparent" }}>recommended</span>}
                </div>
                <div className="text-sm tnum text-right" style={{ color: "var(--ink-secondary)" }}>
                  {inr(annual)}/yr <span style={{ color: "var(--muted)" }}>· ≈{inr(Math.round(annual / 12 / 10) * 10)}/mo</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-2 mt-3">
          <span className="text-[11px]" style={{ color: "var(--muted)" }}>Indicative — subject to underwriting.</span>
          {canAct && digits && (
            <a href={`https://wa.me/${digits}?text=${encodeURIComponent(`Quotation — ${product}: ${inr(cover)} cover at ${inr(Math.round(premium * ropMult))}/yr${rop ? " (with return of premium)" : ""}. Indicative, subject to underwriting.`)}`}
              target="_blank" rel="noreferrer" className="btn btn-sm" style={{ color: "#0c8934", borderColor: "#bfe6cb" }}>
              <MessageCircle size={13} /> Share quote
            </a>
          )}
        </div>
      </div>

      {/* Incentive — staged ladder: small early, big on issue, trail on renewal */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-1">
          <Wallet size={15} style={{ color: "var(--brand)" }} />
          <span className="micro-cap" style={{ color: "var(--ink-mute)" }}>Your incentive on this lead</span>
          <span className="chip" style={{ background: "var(--canvas-soft)", color: "var(--muted)", borderColor: "transparent" }}>illustrative</span>
        </div>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="display-md tnum" style={{ color: "var(--good)" }}>{inr(potential)}</span>
          <span className="text-sm" style={{ color: "var(--muted)" }}>if you take this to issued · + renewal trail</span>
        </div>
        <div className="grid gap-1.5">
          {ladder.map((s) => {
            const done = earned.has(s.key);
            return (
              <div key={s.key} className="flex items-center gap-2.5 p-2.5 rounded-lg" style={{ background: done ? "#e2f4e8" : "var(--canvas-soft)" }}>
                <span className="grid place-items-center rounded-full shrink-0" style={{ width: 20, height: 20, background: done ? "var(--good)" : "#fff", border: done ? "none" : "1.5px solid var(--hairline-input)" }}>
                  {done ? <Check size={12} style={{ color: "#fff" }} /> : null}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{s.label}</div>
                  <div className="text-[11px]" style={{ color: "var(--muted)" }}>{s.note}</div>
                </div>
                <span className="tnum text-sm shrink-0" style={{ color: done ? "var(--good)" : "var(--ink-secondary)", fontWeight: 500 }}>
                  {s.trail ? `+${inr(s.amount)}/yr` : inr(s.amount)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Outcomes */}
      {handoff && (
        <div className="p-3 rounded-lg text-sm flex items-center gap-2 slide-in" style={{ background: "#e2f4e8", color: "var(--good)" }}>
          <Check size={16} /> {handoff}
        </div>
      )}
      {closed ? (
        <div className="card p-4 text-sm" style={{ color: "var(--muted)" }}>Lead closed — {lead.closedReason ?? "not interested"}.</div>
      ) : !canAct ? (
        <div className="card p-4 text-sm flex items-center gap-2" style={{ color: "var(--muted)" }}>
          Sales action — with {lead.owner?.name ?? "the salesperson"}. View only.
        </div>
      ) : acted ? (
        <div className="card p-4">
          <div className="btn w-full justify-start" style={{ opacity: 0.55, cursor: "default" }}>
            <Check size={15} style={{ color: "var(--good)" }} /> {acted === "callback" ? "Callback scheduled" : "Outcome recorded"}
          </div>
        </div>
      ) : isMobile ? (
        <>
          {/* spacer so content isn't hidden behind the fixed bar (bar sits above the bottom nav) */}
          <div style={{ height: 132 }} />
          <div className="fixed inset-x-0 z-20 px-4 pt-3 pb-3" style={{ bottom: 54, background: "linear-gradient(180deg, rgba(238,247,252,0), var(--canvas-soft) 28%)" }}>
            <div className="grid gap-2 max-w-3xl mx-auto">
              <button className="btn btn-primary w-full justify-center" disabled={busy !== null} onClick={() => outcome("interested")}>
                <Check size={16} />{busy === "interested" ? "Opening application…" : "Interested — open application"}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button className="btn w-full justify-center" style={{ background: "#fff" }} disabled={busy !== null} onClick={() => outcome("callback")}><Clock size={15} /> Callback</button>
                <button className="btn w-full justify-center" style={{ background: "#fff" }} disabled={busy !== null} onClick={() => outcome("not_interested")}><PhoneOff size={15} /> Not now</button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="card p-4">
          <SectionTitle>Call outcome</SectionTitle>
          <div className="grid gap-2">
            <button className="btn btn-primary w-full justify-between" disabled={busy !== null} onClick={() => outcome("interested")}>
              <span className="flex items-center gap-2"><Check size={16} />{busy === "interested" ? "Opening application…" : "Interested — accept quote & open application"}</span>
              <ArrowRight size={16} />
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn w-full" disabled={busy !== null} onClick={() => outcome("callback")}>
                <Clock size={15} /> Callback later
              </button>
              <button className="btn w-full" disabled={busy !== null} onClick={() => outcome("not_interested")}>
                <PhoneOff size={15} /> Not interested
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
