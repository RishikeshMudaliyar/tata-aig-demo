"use client";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { Shell } from "@/components/Shell";
import { usePersona } from "@/components/PersonaProvider";
import { fetcher, action } from "@/lib/ui";
import { inr } from "@/lib/domain";
import { RiskBadge, StatusPill, ModuleChip, SpeakButton, SectionTitle } from "@/components/bits";
import { HeartPulse, UserPlus, Wand2, Phone, Check, RotateCcw, Lock } from "lucide-react";

type QItem = {
  id: string; score: number; status: string; reasons: { label: string; module: string }[];
  policyId: string; policyNo: string; product: string; plan: string; fundValue: number | null;
  premium: number; dueDate: string | null; cohortMonth: number | null; orphan: boolean; policyStatus: string;
  customer: { id: string; name: string; language: string; city: string; phone: string };
};

const ACTION_ROLES: Record<string, { roles: string[]; label: string }> = {
  reassign: { roles: ["OPS"], label: "Ops" },
  draft: { roles: ["FLS"], label: "Sales" },
  remind: { roles: ["FLS"], label: "Sales" },
  markSaved: { roles: ["FLS"], label: "Sales" },
};

function Customer360({ customerId }: { customerId: string }) {
  const { data } = useSWR<any>(`/api/customer360?customerId=${customerId}`, fetcher);
  if (!data) return <div className="text-xs" style={{ color: "var(--muted)" }}>Loading 360…</div>;
  const pols = data.policies.items;
  const tickets = data.servicing.items;
  return (
    <div className="p-3 rounded-lg" style={{ background: "var(--canvas-soft)" }}>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-1.5">
        <span className="micro-cap" style={{ color: "var(--brand)" }}>Customer 360</span>
        <div className="flex flex-wrap gap-1.5">
          {["CustMgmt", "Issuance", "TeamMgmt", "Intelligence"].map((m) => <ModuleChip key={m} module={m} />)}
        </div>
      </div>
      <div className="grid gap-1.5 text-sm">
        <Row label="Identity">{data.identity.name} · {data.identity.city} · {data.identity.language}</Row>
        {pols.map((p: any) => (
          <Row key={p.id} label={p.plan}>
            {p.product} · {inr(p.premium)}/{p.mode.toLowerCase()} · due {p.dueDate}
            {p.fundValue ? ` · fund ${inr(p.fundValue)}` : ""}{p.orphan ? " · orphan" : ""}
          </Row>
        ))}
        {tickets.map((t: any) => (
          <Row key={t.id} label={t.type.replace(/_/g, " ").toLowerCase()}>{t.detail}</Row>
        ))}
        {data.applications.items.map((a: any) => (
          <Row key={a.id} label="Application">{a.product} · {inr(a.sumAssured)} · {a.status.replace(/_/g, " ").toLowerCase()}</Row>
        ))}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="font-medium shrink-0" style={{ minWidth: 86 }}>{label}</span>
      <span className="tnum" style={{ color: "var(--muted)" }}>{children}</span>
    </div>
  );
}

function LapseInner() {
  const { persona } = usePersona();
  const { data, mutate } = useSWR<{ queue: QItem[] }>(
    persona ? `/api/lapse?personaId=${persona.id}&role=${persona.role}` : null,
    fetcher
  );
  const { data: metrics, mutate: mutMetrics } = useSWR<any>("/api/metrics", fetcher, { refreshInterval: 3000 });
  const [selId, setSelId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ message: string; talkTrack: string; aiSource: string } | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>({});

  const queue = data?.queue ?? [];
  const sel = queue.find((q) => q.id === selId) ?? null;
  useEffect(() => { if (!selId && queue.length) setSelId(queue[0].id); }, [queue, selId]);
  useEffect(() => { setDraft(null); setDone({}); }, [selId]);

  const can = (act: string) => (persona ? ACTION_ROLES[act]?.roles.includes(persona.role) : false);

  const run = async (act: string) => {
    if (!sel) return;
    setBusy(act);
    const res = await action("/api/lapse", { signalId: sel.id, action: act, actorId: persona?.id });
    if (act === "draft") setDraft({ message: res.message, talkTrack: res.talkTrack, aiSource: res.aiSource });
    setDone((d) => ({ ...d, [act]: true }));
    await mutate();
    await mutMetrics();
    setBusy(null);
  };

  const savedCount = metrics?.live?.saved ?? 0;
  const atRisk = metrics?.live?.atRisk ?? 0;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <div className="micro-cap" style={{ color: "var(--muted)" }}>Retention</div>
          <h1 className="display-lg" style={{ color: "var(--navy)" }}>At-risk policies</h1>
        </div>
        <div className="card px-4 py-2.5 flex items-center gap-4">
          <div className="text-center"><div className="heading-lg tnum" style={{ color: "var(--good)" }}>{savedCount}</div><div className="micro-cap" style={{ color: "var(--muted)" }}>Saved</div></div>
          <div className="w-px h-7" style={{ background: "var(--line)" }} />
          <div className="text-center"><div className="heading-lg tnum" style={{ color: "var(--bad)" }}>{atRisk}</div><div className="micro-cap" style={{ color: "var(--muted)" }}>At risk</div></div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-4">
        {/* Queue */}
        <div>
          <SectionTitle hint="ranked by propensity to lapse">Queue</SectionTitle>
          <div className="grid gap-2">
            {queue.map((q) => (
              <button key={q.id} onClick={() => setSelId(q.id)} className="card p-3 text-left transition"
                style={{ outline: selId === q.id ? "2px solid var(--brand)" : "none" }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-sm">{q.customer.name}</div>
                  <RiskBadge score={q.score} />
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{q.plan} · {q.product}</div>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {q.orphan && <span className="chip" style={{ background: "#fdeaea", color: "var(--bad)", borderColor: "transparent" }}>Orphan</span>}
                  <StatusPill status={q.policyStatus} />
                  {q.fundValue ? <span className="chip tnum">{inr(q.fundValue)} at stake</span> : null}
                  {q.cohortMonth ? <span className="chip tnum">{q.cohortMonth}m</span> : null}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div>
          <SectionTitle hint={sel ? `due ${sel.dueDate}` : ""}>Save workflow</SectionTitle>
          {!sel && <div className="card p-6 text-sm" style={{ color: "var(--muted)" }}>Select a policy.</div>}
          {sel && (
            <div className="card p-4 grid gap-4 fade-in" key={sel.id}>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="heading-md font-semibold" style={{ color: "var(--navy)" }}>{sel.customer.name}</div>
                  <RiskBadge score={sel.score} />
                </div>
                <div className="text-sm tnum" style={{ color: "var(--muted)" }}>{sel.product} · {sel.policyNo}</div>
              </div>

              <div>
                <div className="micro-cap mb-1.5" style={{ color: "var(--muted)" }}>Signals</div>
                <div className="grid gap-1">
                  {sel.reasons.map((r, i) => (
                    <div key={i} className="text-sm" style={{ color: "var(--ink-secondary)" }}>· {r.label}</div>
                  ))}
                </div>
              </div>

              <Customer360 customerId={sel.customer.id} />

              {draft && (
                <div className="grid gap-2 slide-in">
                  <div className="p-3 rounded-lg" style={{ background: "#e8f2fb" }}>
                    <div className="flex items-center justify-between">
                      <span className="micro-cap" style={{ color: "var(--brand)" }}>Save message · {sel.customer.language}</span>
                      <SpeakButton text={draft.message} langHint={sel.customer.language} label="Play" />
                    </div>
                    <div className="text-sm mt-1">{draft.message}</div>
                  </div>
                  <div className="p-3 rounded-lg" style={{ background: "var(--canvas-soft)" }}>
                    <div className="micro-cap mb-1" style={{ color: "var(--muted)" }}>Talk-track</div>
                    <div className="text-sm whitespace-pre-line">{draft.talkTrack}</div>
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                {sel.orphan && (
                  <Gated act="reassign" can={can("reassign")} done={done.reassign} busy={busy === "reassign"} onClick={() => run("reassign")} icon={<UserPlus size={16} />} doneLabel="Reassigned to salesperson">
                    Reassign orphan → salesperson
                  </Gated>
                )}
                <Gated act="draft" can={can("draft")} done={done.draft} busy={busy === "draft"} onClick={() => run("draft")} icon={<Wand2 size={16} />} doneLabel="Message & talk-track drafted">
                  AI-draft save message
                </Gated>
                <Gated act="remind" can={can("remind")} done={done.remind} busy={busy === "remind"} onClick={() => run("remind")} icon={<Phone size={16} />} doneLabel="Reminder & pay link sent" disabled={!draft}>
                  Send reminder + pay link
                </Gated>
                {sel.status !== "SAVED" ? (
                  <Gated act="markSaved" can={can("markSaved")} done={false} busy={busy === "markSaved"} onClick={() => run("markSaved")} icon={<HeartPulse size={16} />} primary>
                    Mark renewed
                  </Gated>
                ) : (
                  <div className="p-3 rounded-lg text-sm font-semibold flex items-center gap-2" style={{ background: "#e2f4e8", color: "var(--good)" }}>
                    <Check size={18} /> Saved.
                  </div>
                )}
                <button className="btn btn-sm btn-ghost self-start" style={{ color: "var(--muted)" }} onClick={() => run("reset")}><RotateCcw size={13} /> Reset</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/** Role-gated, self-greying action button. */
function Gated({ act, can, done, busy, disabled, onClick, icon, children, doneLabel, primary }: {
  act: string; can: boolean; done?: boolean; busy: boolean; disabled?: boolean;
  onClick: () => void; icon: React.ReactNode; children: React.ReactNode; doneLabel?: string; primary?: boolean;
}) {
  const owner = ACTION_ROLES[act]?.label ?? "";
  if (done) {
    return (
      <div className="btn w-full justify-between" style={{ opacity: 0.55, cursor: "default" }}>
        <span className="flex items-center gap-2" style={{ color: "var(--good)" }}><Check size={15} />{doneLabel ?? children}</span>
      </div>
    );
  }
  if (!can) {
    return (
      <div className="btn w-full justify-between" style={{ opacity: 0.55, cursor: "default" }}>
        <span className="flex items-center gap-2" style={{ color: "var(--muted)" }}><Lock size={15} />{children}</span>
        <span className="chip">{owner} action</span>
      </div>
    );
  }
  return (
    <button className={`btn ${primary ? "btn-primary" : "btn-accent"} w-full justify-between`} onClick={onClick} disabled={busy || disabled}>
      <span className="flex items-center gap-2">{icon}{busy ? "Working…" : children}</span>
      <span className="chip" style={{ background: "rgba(255,255,255,0.22)", color: "#fff", borderColor: "transparent" }}>{owner}</span>
    </button>
  );
}

export default function Page() {
  return <Shell><LapseInner /></Shell>;
}
