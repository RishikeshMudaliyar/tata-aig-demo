"use client";
import useSWR from "swr";
import Link from "next/link";
import { fetcher } from "@/lib/ui";
import { moduleMeta } from "@/lib/domain";
import { SectionTitle } from "@/components/bits";
import { ArrowLeft, Cpu, Mic, Sparkles, Workflow, RefreshCw, Headphones } from "lucide-react";

const ROLES = ["Sales", "Risk Ops", "Underwriter", "Ops", "Leadership"];

/** A column of animated connector lanes — data visibly moving between layers. */
function FlowBand({ up }: { up?: boolean }) {
  return (
    <div className="flex justify-center gap-16 py-1" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className={`flow-lane ${up ? "up" : ""}`} style={{ ["--d" as string]: `${i * 0.35}s` }} />
      ))}
    </div>
  );
}

export default function ArchitecturePage() {
  const { data } = useSWR<{ adapters: { module: string; ops: string[] }[] }>("/api/architecture", fetcher);
  const { data: tl } = useSWR<{ events: any[] }>("/api/timeline", fetcher, { refreshInterval: 2500 });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href="/" className="inline-flex items-center gap-1 text-sm mb-4" style={{ color: "var(--muted)" }}><ArrowLeft size={15} /> Back</Link>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="micro-cap" style={{ color: "var(--muted)" }}>Platform architecture</div>
          <h1 className="display-lg" style={{ color: "var(--navy)" }}>One layer over your five modules</h1>
        </div>
        <span className="chip"><span className="pulse-dot" /> live</span>
      </div>

      {/* The journey, end to end — animated */}
      <div className="card p-5 mb-4">
        <SectionTitle hint="one case, every hand-off">The journey, end to end</SectionTitle>
        <JourneyAnimation />
      </div>

      {/* Layer 1: roles */}
      <div className="card p-4">
        <SectionTitle>Role workspaces</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {ROLES.map((r, i) => (
            <div key={r} className="p-3 rounded-lg text-center text-sm tile-live" style={{ background: "#e8f2fb", color: "var(--brand)", fontWeight: 400, ["--d" as string]: `${i * 0.4}s` }}>{r}</div>
          ))}
        </div>
      </div>

      <FlowBand up />

      {/* Layer 2: orchestration + intelligence */}
      <div className="card-dark p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="micro-cap" style={{ color: "rgba(255,255,255,0.65)" }}>Orchestration & AI Intelligence</span>
        </div>
        <div className="grid sm:grid-cols-3 gap-2 text-sm">
          <div className="p-3 rounded-lg flex items-start gap-2.5" style={{ background: "rgba(255,255,255,0.08)" }}>
            <Workflow size={16} style={{ marginTop: 2, color: "#ffb366" }} />
            <div><div style={{ fontWeight: 500 }}>Composer</div><div style={{ opacity: 0.75 }}>Role + task views, assembled across modules.</div></div>
          </div>
          <div className="p-3 rounded-lg flex items-start gap-2.5" style={{ background: "rgba(255,255,255,0.08)" }}>
            <Sparkles size={16} style={{ marginTop: 2, color: "#ffb366" }} />
            <div><div style={{ fontWeight: 500 }}>AI services</div><div style={{ opacity: 0.75 }}>Pre-check, drafting, lapse propensity, nudges.</div></div>
          </div>
          <div className="p-3 rounded-lg flex items-start gap-2.5" style={{ background: "rgba(255,255,255,0.08)" }}>
            <Mic size={16} style={{ marginTop: 2, color: "#ffb366" }} />
            <div><div style={{ fontWeight: 500 }}>Voice</div><div style={{ opacity: 0.75 }}>Vernacular briefs & dictation.</div></div>
          </div>
        </div>
      </div>

      <FlowBand />

      {/* Layer 3: the five core modules, exactly as the requirements document names them */}
      <div className="card p-4">
        <SectionTitle hint="existing digital assets — unchanged">Core modules</SectionTitle>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {data?.adapters.map((a, i) => {
            const m = moduleMeta(a.module);
            return (
              <div key={a.module} className="p-3 rounded-lg border tile-live" style={{ borderColor: "var(--hairline)", ["--d" as string]: `${i * 0.55}s` }}>
                <div className="font-semibold text-sm mb-1.5" style={{ color: "var(--navy)" }}>{m.label}</div>
                <div className="grid gap-0.5">
                  {a.ops.map((o) => (
                    <div key={o} className="text-[11.5px]" style={{ color: "var(--muted)" }}>{o}</div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* THE FLYWHEEL — we suggest what to say, and we capture what was actually said */}
      <div className="card p-5 mt-4">
        <SectionTitle hint="the loop that makes it self-improving">Suggest → capture → learn</SectionTitle>
        <div className="grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-4 items-center mt-2">
          {/* left: suggest */}
          <div className="p-4 rounded-xl" style={{ background: "#e8f2fb", border: "1px solid #c9dff2" }}>
            <div className="micro-cap mb-1" style={{ color: "var(--brand)" }}>1 · Suggest</div>
            <div className="font-semibold text-sm mb-1">What the salesperson should say</div>
            <div className="text-[12.5px]" style={{ color: "var(--ink-secondary)" }}>
              Talk-track, recommended product, quote and objection handling — pushed to them before the call.
            </div>
          </div>

          {/* the loop arrows */}
          <div className="grid place-items-center px-1">
            <div className="flywheel-ring grid place-items-center" style={{ width: 74, height: 74, borderRadius: 999, border: "2px dashed #6b4fd8" }}>
              <RefreshCw size={22} style={{ color: "#6b4fd8" }} />
            </div>
            <div className="text-[10.5px] text-center mt-1.5" style={{ color: "#6b4fd8" }}>every cycle<br />improves the next</div>
          </div>

          {/* right: capture */}
          <div className="p-4 rounded-xl" style={{ background: "#f3f0ff", border: "1px solid #ddd4f8" }}>
            <div className="micro-cap mb-1" style={{ color: "#6b4fd8" }}>2 · Capture</div>
            <div className="font-semibold text-sm mb-2">What was actually said</div>
            <div className="grid gap-1.5 text-[12.5px]">
              <div className="flex items-start gap-2">
                <Headphones size={14} style={{ color: "#6b4fd8", marginTop: 2 }} className="shrink-0" />
                <span><b>On-platform calls</b> — telephony transcripts captured automatically.</span>
              </div>
              <div className="flex items-start gap-2">
                <Mic size={14} style={{ color: "#6b4fd8", marginTop: 2 }} className="shrink-0" />
                <span><b>Face-to-face</b> — always-on recorder in the sales PWA (consented).</span>
              </div>
            </div>
          </div>
        </div>

        {/* what the loop produces */}
        <div className="grid sm:grid-cols-3 gap-2 mt-4">
          {[
            { n: "3 · Monitor", t: "Was the promise made the policy sold?", d: "Mis-selling and disclosure checks on 100% of conversations — not a 2% sample." },
            { n: "4 · Learn", t: "Which pitch actually converts?", d: "Objections, lost reasons and winning language, by segment and language." },
            { n: "5 · Improve", t: "The next suggestion is better", d: "Talk-tracks, lead scores and AI delegation thresholds retrain on your own outcomes." },
          ].map((x) => (
            <div key={x.n} className="p-3 rounded-lg" style={{ background: "var(--canvas-soft)" }}>
              <div className="micro-cap mb-1" style={{ color: "var(--muted)" }}>{x.n}</div>
              <div className="text-sm font-medium mb-0.5">{x.t}</div>
              <div className="text-[12px]" style={{ color: "var(--muted)" }}>{x.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Live activity stream */}
      <div className="card p-4 mt-4">
        <div className="flex items-center gap-2 mb-2">
          <Cpu size={14} style={{ color: "var(--brand)" }} />
          <SectionTitle>Orchestration activity</SectionTitle>
        </div>
        <div className="grid gap-1.5">
          {tl?.events.slice(0, 6).map((e, i) => (
            <div key={e.id} className={`flex items-center gap-2.5 text-sm ${i === 0 ? "tick-in" : ""}`}>
              <span className="grid place-items-center rounded-full text-[9.5px] shrink-0" style={{ width: 20, height: 20, background: e.actor ? "var(--brand)" : "var(--primary)", color: "#fff", fontWeight: 500 }}>
                {e.actor?.initials ?? "AI"}
              </span>
              <span className="truncate">
                <span className="font-medium">{e.actor?.name ?? "Orchestrator"}</span>{" "}
                <span style={{ color: "var(--muted)" }}>{e.verb}</span>
              </span>
              <span className="ml-auto text-[11px] mono shrink-0" style={{ color: "var(--muted)" }}>{ago(e.createdAt)}</span>
            </div>
          ))}
          {!tl && <div className="text-sm" style={{ color: "var(--muted)" }}>Listening…</div>}
        </div>
      </div>
    </div>
  );
}

// AI is NOT a stage — it's a layer underneath every stage. `ai` = how much of that
// stage's work AI already carries today; it grows as the system learns.
const JOURNEY_STAGES = [
  { label: "Lead", who: "Sales", ai: 50, aiNote: "delegated calls" },
  { label: "Documents", who: "Customer + Sales", ai: 35, aiNote: "capture & chase" },
  { label: "Risk Ops", who: "Verify · L2", ai: 50, aiNote: "auto-scrutiny" },
  { label: "Underwriter", who: "Decide · L3", ai: 10, aiNote: "case assembly" },
  { label: "Issued", who: "Policy in book", ai: 20, aiNote: "auto-QC" },
];

function JourneyAnimation() {
  const step = 100 / (JOURNEY_STAGES.length - 1);
  return (
    <div className="pt-6 pb-2 px-2">
      {/* forward track */}
      <div className="journey-track mx-4">
        <div className="journey-dot" />
        {JOURNEY_STAGES.map((s, i) => (
          <div key={s.label} className="journey-node" style={{ left: `${i * step}%`, animationDelay: `${[0, 2.8, 5.4, 8.0, 10.9][i]}s` }} />
        ))}
      </div>
      {/* labels */}
      <div className="relative mx-4 mt-3" style={{ height: 34 }}>
        {JOURNEY_STAGES.map((s, i) => (
          <div key={s.label} className="absolute text-center" style={{ left: `${i * step}%`, transform: "translateX(-50%)", width: 110 }}>
            <div className="text-[12px] font-medium leading-tight">{s.label}</div>
            <div className="text-[10.5px]" style={{ color: "var(--muted)" }}>{s.who}</div>
          </div>
        ))}
      </div>

      {/* THE AI LAYER — runs under every stage; thickness = how much AI already carries */}
      <div className="mx-4 mt-5 rounded-xl p-3" style={{ background: "#f3f0ff", border: "1px solid #ddd4f8" }}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="micro-cap" style={{ color: "#6b4fd8" }}>AI layer — runs under every stage</span>
          <span className="text-[10.5px]" style={{ color: "#6b4fd8" }}>thickness = share of work AI carries today ↑ grows as it learns</span>
        </div>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${JOURNEY_STAGES.length}, minmax(0,1fr))` }}>
          {JOURNEY_STAGES.map((s) => (
            <div key={s.label} className="flex flex-col justify-end items-center" style={{ height: 46 }}>
              <div className="w-full rounded-md ai-grow" style={{ height: `${Math.max(8, s.ai * 0.42)}px`, background: "#6b4fd8", opacity: 0.25 + (s.ai / 100) * 0.75 }} />
              <div className="text-[10.5px] tnum mt-1" style={{ color: "#6b4fd8", fontWeight: 500 }}>{s.ai}%</div>
              <div className="text-[9.5px] text-center leading-tight" style={{ color: "var(--muted)" }}>{s.aiNote}</div>
            </div>
          ))}
        </div>
      </div>

      {/* send-back return path */}
      <div className="mx-4 mt-4" style={{ paddingLeft: "0%", paddingRight: "25%" }}>
        <div className="journey-return">
          <div className="journey-return-dot" />
        </div>
        <div className="text-[10.5px] mt-2" style={{ color: "var(--warn)" }}>
          Send-back — Risk Ops returns the case to the same salesperson; resolved, it re-enters where it left off.
        </div>
      </div>
    </div>
  );
}

function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 90) return "now";
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
}
