"use client";
import useSWR from "swr";
import { Shell } from "@/components/Shell";
import { usePersona } from "@/components/PersonaProvider";
import { fetcher } from "@/lib/ui";
import { inr } from "@/lib/domain";
import { KPI_DEFS, type KpiCard } from "@/lib/kpi";
import { SectionTitle } from "@/components/bits";
import { useState } from "react";
import { action } from "@/lib/ui";
import { Send, Sparkles, X, Check, AlertTriangle, MessageSquare } from "lucide-react";

type Resp = { scope: "self" | "team"; month: string; targets: Record<string, number>; cards: KpiCard[] };

function fmt(v: number, money: boolean) { return money ? inr(v) : String(v); }
function tone(pct: number) { return pct >= 100 ? "var(--good)" : pct >= 60 ? "var(--warn)" : "var(--bad)"; }

/** A single KPI: actual vs the number they were supposed to hit, with a progress bar. */
function KpiTile({ label, actual, target, money }: { label: string; actual: number; target: number; money: boolean }) {
  const pct = target ? Math.round((actual / target) * 100) : 0;
  const c = tone(pct);
  return (
    <div className="card p-4">
      <div className="micro-cap mb-1" style={{ color: "var(--muted)" }}>{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span className="display-md tnum" style={{ color: "var(--navy)" }}>{fmt(actual, money)}</span>
        <span className="text-sm tnum" style={{ color: "var(--muted)" }}>/ {fmt(target, money)}</span>
      </div>
      <div className="rounded-full overflow-hidden my-2" style={{ height: 7, background: "var(--canvas-soft)" }}>
        <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: c }} />
      </div>
      <div className="text-[11px] tnum" style={{ color: c }}>
        {pct}% of target{pct < 100 ? ` · ${fmt(Math.max(0, target - actual), money)} to go` : " · target hit "}
      </div>
    </div>
  );
}

function SelfView({ data }: { data: Resp }) {
  const card = data.cards[0];
  if (!card) return <div className="card p-6 text-sm" style={{ color: "var(--muted)" }}>No data.</div>;
  const c = tone(card.attainment);
  return (
    <>
      <div className="card p-5 mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="micro-cap" style={{ color: "var(--muted)" }}>Premium target achieved · {data.month}</div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="display-lg tnum" style={{ color: c }}>{card.attainment}%</span>
            <span className="text-sm" style={{ color: "var(--muted)" }}>of your GWP target</span>
          </div>
        </div>
        <div className="text-right">
          <div className="micro-cap" style={{ color: "var(--muted)" }}>Incentive earned</div>
          <div className="display-md tnum" style={{ color: "var(--good)" }}>{inr(card.actuals.incentive)}</div>
        </div>
      </div>

      <SectionTitle hint="the numbers you were set for this month">Your KPIs</SectionTitle>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {KPI_DEFS.map((d) => (
          <KpiTile key={d.key} label={d.label} actual={card.actuals[d.key] ?? 0} target={data.targets[d.key] ?? 0} money={d.money} />
        ))}
      </div>
      <p className="text-[11px] mt-4" style={{ color: "var(--muted)" }}>Actuals are live from your book; targets are illustrative/configurable.</p>
    </>
  );
}

function TeamView({ data, meId }: { data: Resp; meId?: string }) {
  const [nudgeFor, setNudgeFor] = useState<{ id: string; name: string; branch: string | null } | null>(null);
  const teamPolicies = data.cards.reduce((s, c) => s + c.actuals.policies, 0);
  const teamGwp = data.cards.reduce((s, c) => s + c.actuals.gwp, 0);
  const teamInc = data.cards.reduce((s, c) => s + c.actuals.incentive, 0);
  return (
    <>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Policies issued", v: String(teamPolicies) },
          { label: "New premium (GWP)", v: inr(teamGwp) },
          { label: "Incentive paid out", v: inr(teamInc) },
        ].map((t) => (
          <div key={t.label} className="card p-4">
            <div className="micro-cap mb-1" style={{ color: "var(--muted)" }}>{t.label}</div>
            <div className="display-md tnum" style={{ color: "var(--navy)" }}>{t.v}</div>
          </div>
        ))}
      </div>

      <SectionTitle hint="ranked by attainment">Sales managers</SectionTitle>
      <div className="card p-1 overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr className="micro-cap" style={{ color: "var(--muted)" }}>
              {["Sales manager", "Attainment", "Policies", "GWP", "Incentive", "Saves", ""].map((h) => (
                <th key={h} className="text-left font-normal px-3 py-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.cards.map((c) => {
              const col = tone(c.attainment);
              return (
                <tr key={c.persona.id} style={{ borderTop: "1px solid var(--hairline)" }}>
                  <td className="px-3 py-2.5 font-medium">{c.persona.name}
                    <span className="text-[11px] ml-1.5" style={{ color: "var(--muted)" }}>{c.persona.branch}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="rounded-full overflow-hidden" style={{ width: 60, height: 6, background: "var(--canvas-soft)" }}>
                        <div style={{ width: `${Math.min(100, c.attainment)}%`, height: "100%", background: col }} />
                      </div>
                      <span className="tnum" style={{ color: col, fontWeight: 500 }}>{c.attainment}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 tnum">{c.actuals.policies} <span style={{ color: "var(--muted)" }}>/ {data.targets.policies}</span></td>
                  <td className="px-3 py-2.5 tnum">{inr(c.actuals.gwp)}</td>
                  <td className="px-3 py-2.5 tnum" style={{ color: "var(--good)" }}>{inr(c.actuals.incentive)}</td>
                  <td className="px-3 py-2.5 tnum">{c.actuals.saves} <span style={{ color: "var(--muted)" }}>/ {data.targets.saves}</span></td>
                  <td className="px-3 py-2.5 text-right">
                    <button className="btn btn-sm" style={{ color: "var(--brand)", borderColor: "#c9dff2" }} onClick={() => setNudgeFor(c.persona)}>
                      <Sparkles size={13} /> Nudge
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] mt-4" style={{ color: "var(--muted)" }}>Actuals live from each manager&apos;s book; targets illustrative/configurable.</p>
      {nudgeFor && <NudgePanel person={nudgeFor} meId={meId} onClose={() => setNudgeFor(null)} />}
    </>
  );
}

function PerformanceInner() {
  const { persona } = usePersona();
  const { data } = useSWR<Resp>(persona ? `/api/performance?personaId=${persona.id}&role=${persona.role}` : null, fetcher, { refreshInterval: 5000 });
  const self = persona?.role === "FLS";

  return (
    <>
      <div className="mb-5">
        <div className="micro-cap" style={{ color: "var(--muted)" }}>{self ? "Self-management · KPIs" : "Team performance · all sales managers"}</div>
        <h1 className="display-lg" style={{ color: "var(--navy)" }}>{self ? "My performance" : "Performance"}</h1>
      </div>
      {!data && <div className="text-sm" style={{ color: "var(--muted)" }}>Loading…</div>}
      {data && (data.scope === "self" ? <SelfView data={data} /> : <TeamView data={data} meId={persona?.id} />)}
    </>
  );
}

export default function Page() {
  return <Shell><PerformanceInner /></Shell>;
}

/* ---------- NUDGE: AI diagnoses where they're lagging and drafts the message ---------- */
type Gap = { id: string; severity: "HIGH" | "MEDIUM"; title: string; evidence: string; draft: string; href?: string };

function NudgePanel({ person, meId, onClose }: { person: { id: string; name: string; branch: string | null }; meId?: string; onClose: () => void }) {
  const { data } = useSWR<{ headline: string; gaps: Gap[]; lastNudge: { text: string; at: string; readAt: string | null } | null }>(
    `/api/nudge?personaId=${person.id}`, fetcher
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const gaps = data?.gaps ?? [];
  const active = gaps.find((g) => g.id === selected) ?? null;

  const pick = (g: Gap) => { setSelected(g.id); setText(g.draft); };
  const pickGeneral = (t = "") => { setSelected("general"); setText(t); };

  const GENERAL = [
    "Month-end push — let's close what's already in flight before chasing new leads. Flag anything you need help unblocking.",
    "Please keep your pipeline updated today — every lead should have a next step against it.",
    "Team review tomorrow at 11. Come with your top 3 cases and what you need from me to close them.",
  ];

  const send = async () => {
    setBusy(true);
    await action("/api/nudge", { fromId: meId, toPersonaId: person.id, text, href: active?.href });
    setBusy(false); setSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 fade-in" style={{ background: "rgba(9,20,30,0.45)" }} onClick={onClose}>
      <div className="card card-float w-full p-5" style={{ maxWidth: 620, maxHeight: "88vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="micro-cap" style={{ color: "var(--muted)" }}>Nudge · {person.branch}</div>
            <h3 className="display-md" style={{ color: "var(--navy)" }}>{person.name}</h3>
          </div>
          <button onClick={onClose} style={{ color: "var(--ink-mute)" }}><X size={20} /></button>
        </div>

        {sent ? (
          <div className="p-4 rounded-lg text-sm flex items-center gap-2" style={{ background: "#e2f4e8", color: "var(--good)" }}>
            <Check size={17} /> Nudge sent — it&apos;s at the top of {person.name.split(" ")[0]}&apos;s My Day and their notifications.
          </div>
        ) : (
          <>
            {!data && <div className="text-sm" style={{ color: "var(--muted)" }}>Analysing their book…</div>}
            {data && (
              <>
                <div className="p-3 rounded-lg mb-3 flex items-start gap-2" style={{ background: "#f3f0ff", border: "1px solid #ddd4f8" }}>
                  <Sparkles size={15} style={{ color: "#6b4fd8", marginTop: 2 }} className="shrink-0" />
                  <div className="text-[13px]">
                    <b style={{ color: "#6b4fd8" }}>AI found {gaps.length} thing{gaps.length !== 1 ? "s" : ""} holding them back.</b>{" "}
                    <span style={{ color: "var(--ink-secondary)" }}>Pick one to send a specific nudge — not &quot;do better&quot;.</span>
                  </div>
                </div>

                <div className="grid gap-2 mb-4">
                  {gaps.map((g) => (
                    <button key={g.id} onClick={() => pick(g)} className="text-left p-3 rounded-lg transition"
                      style={{ background: selected === g.id ? "#e8f2fb" : "var(--canvas-soft)", outline: selected === g.id ? "1.5px solid var(--brand)" : "none" }}>
                      <div className="flex items-center gap-2 mb-0.5">
                        {g.severity === "HIGH" && <AlertTriangle size={13} style={{ color: "var(--bad)" }} />}
                        <span className="font-medium text-sm">{g.title}</span>
                      </div>
                      <div className="text-[12px]" style={{ color: "var(--muted)" }}>{g.evidence}</div>
                    </button>
                  ))}
                  {gaps.length === 0 && <div className="card-flat p-4 text-sm" style={{ color: "var(--muted)" }}>On track — nothing to flag.</div>}

                  <button onClick={() => pickGeneral()} className="text-left p-3 rounded-lg transition"
                    style={{ background: selected === "general" ? "#e8f2fb" : "var(--canvas-soft)", outline: selected === "general" ? "1.5px solid var(--brand)" : "none", borderTop: "1px dashed var(--hairline)" }}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <MessageSquare size={13} style={{ color: "var(--brand)" }} />
                      <span className="font-medium text-sm">General nudge</span>
                    </div>
                    <div className="text-[12px]" style={{ color: "var(--muted)" }}>Not tied to a specific lead — write your own message.</div>
                  </button>
                </div>

                {selected && (
                  <div className="slide-in">
                    {selected === "general" && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {GENERAL.map((t, i) => (
                          <button key={i} className="chip" style={{ cursor: "pointer" }} onClick={() => setText(t)}>Template {i + 1}</button>
                        ))}
                      </div>
                    )}
                    <div className="micro-cap mb-1.5" style={{ color: "var(--muted)" }}>Nudge — edit before sending</div>
                    <textarea className="w-full text-sm p-3 rounded-lg border mb-3" rows={4}
                      style={{ borderColor: "var(--hairline-input)", background: "#fff" }}
                      placeholder={selected === "general" ? `Write a message to ${person.name.split(" ")[0]}…` : undefined}
                      value={text} onChange={(e) => setText(e.target.value)} />
                    <button className="btn btn-primary w-full justify-center" disabled={busy || !text.trim()} onClick={send}>
                      <Send size={15} /> {busy ? "Sending…" : `Send to ${person.name.split(" ")[0]}`}
                    </button>
                  </div>
                )}

                {data.lastNudge && (
                  <div className="mt-4 pt-3 text-[12px]" style={{ borderTop: "1px solid var(--hairline)", color: "var(--muted)" }}>
                    Last nudge: “{data.lastNudge.text.slice(0, 90)}…” · {data.lastNudge.readAt ? "acknowledged" : "not yet opened"}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
