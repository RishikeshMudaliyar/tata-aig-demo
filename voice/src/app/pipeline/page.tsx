"use client";
import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Shell } from "@/components/Shell";
import { usePersona } from "@/components/PersonaProvider";
import { fetcher, timeAgo } from "@/lib/ui";
import { inr } from "@/lib/domain";
import { SectionTitle } from "@/components/bits";
import { ChevronRight, X } from "lucide-react";

type Row = {
  id: string; kind: string; owner?: string | null; customer: string; product: string; value: number;
  stage: string; stageLabel: string; holder: { name: string; role: string } | null;
  missing: string; nextStep: string; sinceISO: string | null; slaHours: number | null; active: boolean;
};

function ageHours(iso: string | null): number {
  if (!iso) return 0;
  return (Date.now() - new Date(iso).getTime()) / 3600_000;
}
const breached = (r: Row) => r.slaHours != null && ageHours(r.sinceISO) >= r.slaHours;

/** Deep link into the actual record: lead page, case page, or the retention queue. */
function hrefFor(r: Row): string {
  if (r.id.startsWith("lead-")) return `/lead?id=${r.id.slice(5)}`;
  if (r.id.startsWith("app-")) return `/case?id=${r.id.slice(4)}`;
  return "/lapse";
}

function AgeChip({ row }: { row: Row }) {
  const h = ageHours(row.sinceISO);
  const label = h < 1 ? `${Math.max(1, Math.round(h * 60))}m` : h < 48 ? `${Math.round(h)}h` : `${Math.round(h / 24)}d`;
  if (!row.slaHours) return <span className="chip tnum">{label}</span>;
  const ratio = h / row.slaHours;
  const bg = ratio >= 1 ? "#fdeaea" : ratio >= 0.6 ? "#fdf3e3" : "#e2f4e8";
  const fg = ratio >= 1 ? "var(--bad)" : ratio >= 0.6 ? "var(--warn)" : "var(--good)";
  return <span className="chip tnum" style={{ background: bg, color: fg, borderColor: "transparent" }}>{label} / SLA {row.slaHours}h</span>;
}

function HolderChip({ holder }: { holder: Row["holder"] }) {
  if (!holder) return null;
  return <span className="chip" style={{ background: "#e8f2fb", color: "var(--brand)", borderColor: "transparent" }}>{holder.name} · {holder.role}</span>;
}

function DetailCard({ r, accent }: { r: Row; accent?: boolean }) {
  return (
    <Link href={hrefFor(r)} className="card p-4 block transition hover:-translate-y-px" style={accent ? { borderLeft: "3px solid var(--warn)" } : undefined}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-semibold">{r.customer}</span>
          <span className="text-sm" style={{ color: "var(--muted)" }}>{r.product}</span>
          {r.value ? <span className="text-sm tnum" style={{ color: "var(--muted)" }}>{inr(r.value)}/yr</span> : null}
        </div>
        <div className="flex items-center gap-1.5">
          <AgeChip row={r} />
          <ChevronRight size={14} style={{ color: "var(--ink-mute)" }} />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-[1.1fr_1.4fr_1.4fr] gap-x-4 gap-y-1.5 text-sm">
        <div>
          <div className="micro-cap" style={{ color: "var(--muted)" }}>Stage · bucket</div>
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5"><span className="font-medium">{r.stageLabel}</span><HolderChip holder={r.holder} /></div>
        </div>
        <div>
          <div className="micro-cap" style={{ color: "var(--muted)" }}>What&apos;s missing</div>
          <div className="mt-0.5">{r.missing}</div>
        </div>
        <div>
          <div className="micro-cap" style={{ color: "var(--muted)" }}>Next step</div>
          <div className="mt-0.5" style={{ color: "var(--ink-secondary)" }}>{r.nextStep}</div>
        </div>
      </div>
    </Link>
  );
}

/** One-line row for the complete list — status + holder + last-touched, click through to the record. */
function ListRow({ r }: { r: Row }) {
  const done = r.stage === "ISSUED" || r.stage === "SAVED";
  return (
    <Link href={hrefFor(r)} className="card-flat px-4 py-2.5 flex items-center justify-between gap-3 text-sm transition hover:bg-white">
      <div className="flex items-center gap-2.5 flex-wrap min-w-0">
        <span className="font-medium">{r.customer}</span>
        <span className="truncate" style={{ color: "var(--muted)" }}>{r.product}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {r.active && breached(r) && <span className="chip" style={{ background: "#fdeaea", color: "var(--bad)", borderColor: "transparent" }}>SLA</span>}
        <span className="chip" style={done ? { background: "#e2f4e8", color: "var(--good)", borderColor: "transparent" } : {}}>{r.stageLabel}</span>
        {r.active && <HolderChip holder={r.holder} />}
        <span className="tnum text-[12px] whitespace-nowrap" style={{ color: "var(--ink-mute)" }}>{timeAgo(r.sinceISO)}</span>
        <ChevronRight size={14} style={{ color: "var(--ink-mute)" }} />
      </div>
    </Link>
  );
}

/* ---------- SALES: my book — every one of MY leads/cases, detailed ---------- */
function SalesBook({ rows }: { rows: Row[] }) {
  const active = rows.filter((r) => r.active);
  const closed = rows.filter((r) => !r.active);
  return (
    <>
      <SectionTitle hint={`${active.length} active`}>Where each of yours sits</SectionTitle>
      {active.length === 0 && <div className="card p-6 text-sm mb-4" style={{ color: "var(--muted)" }}>Nothing active.</div>}
      <div className="grid gap-2.5 mb-6">
        {active.map((r) => <DetailCard key={r.id} r={r} />)}
      </div>
      {closed.length > 0 && (
        <>
          <SectionTitle hint={`${closed.length}`}>Issued & closed</SectionTitle>
          <div className="grid gap-1.5">{closed.map((r) => <ListRow key={r.id} r={r} />)}</div>
        </>
      )}
    </>
  );
}

/* ---------- LEADERSHIP: colour-by-stage board — one colour per stage, mapped onto every lead row ---------- */
// Every column = a stage of the lead, named by the activity — consistent, never a role.
const NB_FUNNEL = [
  { key: "LEADS", label: "To contact" },
  { key: "DOC_COLLECTION", label: "Collecting documents" },
  { key: "SENT_BACK", label: "Awaiting info" },
  { key: "ANALYST_REVIEW", label: "In review" },
  { key: "UW_REVIEW", label: "In underwriting" },
  { key: "ISSUED", label: "Issued" },
];
const RET_FUNNEL = [
  { key: "ORPHAN", label: "To reassign" },
  { key: "WITH_SALES", label: "To save" },
  { key: "QUERY", label: "Resolving query" },
  { key: "SAVED", label: "Saved" },
];

// The single source of truth for a stage's short label — used on funnel tiles AND row chips.
const STAGE_LABEL: Record<string, string> = {
  LEADS: "To contact", DOC_COLLECTION: "Collecting documents", SENT_BACK: "Awaiting info",
  ANALYST_REVIEW: "In review", UW_REVIEW: "In underwriting", ISSUED: "Issued",
  ORPHAN: "To reassign", WITH_SALES: "To save", QUERY: "Resolving query", SAVED: "Saved",
};

// One colour per stage — reused on the board tiles AND as each row's left-edge marker
// and stage chip, so a row's colour maps straight back to its column. Minimal & semantic.
const STAGE_COLOR: Record<string, string> = {
  LEADS: "#64748d",          // slate — untouched
  DOC_COLLECTION: "#c77700", // amber — collecting
  SENT_BACK: "#d32f2f",      // red — stuck
  ANALYST_REVIEW: "#0072bc", // blue — analyst
  UW_REVIEW: "#6b4fd8",      // violet — underwriter
  ISSUED: "#0c8934",         // green — done
  ORPHAN: "#d32f2f",         // red — unassigned
  WITH_SALES: "#0072bc",     // blue — being worked
  QUERY: "#c77700",          // amber — service query
  SAVED: "#0c8934",          // green — saved
};

function rowStageKey(r: Row, tab: "nb" | "ret"): string {
  if (tab === "ret") {
    if (r.kind === "QUERY") return "QUERY";
    if (r.stage === "SAVED") return "SAVED";
    return r.stageLabel.includes("orphan") ? "ORPHAN" : "WITH_SALES";
  }
  if (r.kind === "LEAD") return "LEADS";
  if (["DOC_COLLECTION", "SENT_BACK", "ANALYST_REVIEW", "UW_REVIEW", "ISSUED"].includes(r.stage)) return r.stage;
  return "LEADS";
}

/** A lead row on the leadership board — colour-tagged to its stage. */
function ExecRow({ r, tab }: { r: Row; tab: "nb" | "ret" }) {
  const key = rowStageKey(r, tab);
  const color = STAGE_COLOR[key] ?? "#64748d";
  const stuck = r.active && (breached(r) || r.stage === "SENT_BACK") && r.missing && r.missing !== "—";
  return (
    <Link href={hrefFor(r)} className="card-flat flex items-center gap-3 pr-4 py-2.5 text-sm transition hover:bg-white"
      style={{ borderLeft: `3px solid ${color}`, paddingLeft: 14 }}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{r.customer}</span>
          <span className="truncate" style={{ color: "var(--muted)" }}>{r.product}</span>
        </div>
        {stuck && <div className="text-[12px] mt-0.5" style={{ color: "var(--bad)" }}>Stuck: {r.missing}</div>}
      </div>
      <span className="chip shrink-0" style={{ background: `${color}14`, color, borderColor: "transparent" }}>{STAGE_LABEL[key] ?? r.stageLabel}</span>
      {r.active && <HolderChip holder={r.holder} />}
      <span className="tnum text-[12px] whitespace-nowrap shrink-0" style={{ color: "var(--ink-mute)" }}>{timeAgo(r.sinceISO)}</span>
      <ChevronRight size={14} style={{ color: "var(--ink-mute)" }} className="shrink-0" />
    </Link>
  );
}

const MATCH: Record<string, (r: Row) => boolean> = {
  LEADS: (r) => r.kind === "LEAD" && r.active,
  DOC_COLLECTION: (r) => r.stage === "DOC_COLLECTION",
  SENT_BACK: (r) => r.stage === "SENT_BACK",
  ANALYST_REVIEW: (r) => r.stage === "ANALYST_REVIEW",
  UW_REVIEW: (r) => r.stage === "UW_REVIEW",
  ISSUED: (r) => r.stage === "ISSUED",
  IN_UW: (r) => r.stage === "ANALYST_REVIEW" || r.stage === "UW_REVIEW",
  BREACH: (r) => r.active && breached(r),
  ORPHAN: (r) => r.kind === "RETENTION" && r.active && r.stageLabel.includes("orphan"),
  WITH_SALES: (r) => r.kind === "RETENTION" && r.active && !r.stageLabel.includes("orphan"),
  QUERY: (r) => r.kind === "QUERY",
  RET_ACTIVE: (r) => r.kind === "RETENTION" && r.active,
  SAVED: (r) => r.stage === "SAVED",
};
const FILTER_LABEL: Record<string, string> = {
  LEADS: "To contact", DOC_COLLECTION: "Collecting documents", SENT_BACK: "Awaiting info", ANALYST_REVIEW: "In review",
  UW_REVIEW: "In underwriting", ISSUED: "Issued", IN_UW: "In review / underwriting", BREACH: "Breaching SLA",
  ORPHAN: "To reassign", WITH_SALES: "To save", QUERY: "Resolving query",
  RET_ACTIVE: "At risk", SAVED: "Saved",
};

const UNASSIGNED = "With Ops — unassigned";
const ownerKey = (r: Row) => r.owner ?? UNASSIGNED;

const PAGE_SIZE = 12;

function ExecView({ rows, tab }: { rows: Row[]; tab: "nb" | "ret" }) {
  const funnel = tab === "nb" ? NB_FUNNEL : RET_FUNNEL;
  const [filter, setFilter] = useState<{ key: string | null; owner: string | null }>({ key: null, owner: null });
  const [view, setView] = useState<"overview" | "all">("overview");
  const [page, setPage] = useState(0);

  // open the paginated "All leads" tab, optionally pre-filtered by a clicked number
  const openList = (key: string | null = null, owner: string | null = null) => { setFilter({ key, owner }); setView("all"); setPage(0); };

  // per-salesperson rollup — owner-less rows (orphans, orphan queries) get their own line so totals reconcile
  const owners = Array.from(new Set(rows.map(ownerKey)));
  const rollup = owners.map((o) => {
    const mine = rows.filter((r) => ownerKey(r) === o);
    return {
      owner: o,
      leads: mine.filter(MATCH.LEADS).length,
      docs: mine.filter(MATCH.DOC_COLLECTION).length,
      inUw: mine.filter(MATCH.IN_UW).length,
      sentBack: mine.filter(MATCH.SENT_BACK).length,
      atRisk: mine.filter(MATCH.RET_ACTIVE).length,
      queries: mine.filter(MATCH.QUERY).length,
      breaching: mine.filter(MATCH.BREACH).length,
      value: mine.filter((r) => r.active && r.kind !== "LEAD").reduce((s, r) => s + r.value, 0),
      done: mine.filter((r) => r.stage === "ISSUED" || r.stage === "SAVED").length,
    };
  }).filter((r) => r.leads + r.docs + r.inUw + r.sentBack + r.atRisk + r.queries + r.done > 0)
    .sort((a, b) => Number(a.owner === UNASSIGNED) - Number(b.owner === UNASSIGNED) || b.value - a.value);

  // the complete list — filtered when a number was clicked; paginated so 1000s of rows never break the view
  const listed = rows
    .filter((r) => (filter.key ? MATCH[filter.key]?.(r) : true))
    .filter((r) => (filter.owner ? ownerKey(r) === filter.owner : true))
    .sort((a, b) => Number(b.active) - Number(a.active) || Number(breached(b)) - Number(breached(a)) || ageHours(b.sinceISO) - ageHours(a.sinceISO));
  const pageCount = Math.max(1, Math.ceil(listed.length / PAGE_SIZE));
  const pageRows = listed.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const cell = (n: number, key: string, owner: string) => (
    <button className="tnum px-1.5 py-0.5 rounded-md transition" disabled={n === 0}
      style={{ color: n === 0 ? "var(--muted)" : "var(--brand)", cursor: n === 0 ? "default" : "pointer", fontWeight: n === 0 ? 400 : 500 }}
      onClick={() => n > 0 && openList(key, owner)}>
      {n}
    </button>
  );

  return (
    <>
      {/* two views: the abstracted overview, and a paginated full list */}
      <div className="flex gap-1 p-1 rounded-full mb-4 w-max" style={{ background: "#eef2f6" }}>
        {(["overview", "all"] as const).map((v) => (
          <button key={v} className="px-4 py-1.5 rounded-full text-[13px] transition"
            style={{ background: view === v ? "#fff" : "transparent", fontWeight: view === v ? 500 : 400, boxShadow: view === v ? "var(--shadow-1)" : "none" }}
            onClick={() => { setView(v); if (v === "overview") setFilter({ key: null, owner: null }); }}>
            {v === "overview" ? "Overview" : `All leads (${rows.length})`}
          </button>
        ))}
      </div>

      {view === "overview" ? (
        <>
          {/* colour-by-stage board — each stage is a colour; the count answers "how many are here" */}
          <SectionTitle hint="tap a stage to see the leads">Where every lead stands</SectionTitle>
          <div className="grid gap-2 mb-6" style={{ gridTemplateColumns: `repeat(${funnel.length}, minmax(0,1fr))` }}>
            {funnel.map((f) => {
              const n = rows.filter(MATCH[f.key]).length;
              const color = STAGE_COLOR[f.key] ?? "#64748d";
              return (
                <button key={f.key} className="card text-left px-3 pt-2 pb-2.5 transition" disabled={n === 0}
                  style={{ borderTop: `3px solid ${color}`, opacity: n === 0 ? 0.55 : 1, cursor: n === 0 ? "default" : "pointer" }}
                  onClick={() => n > 0 && openList(f.key)}>
                  <div className="display-md tnum" style={{ color }}>{n}</div>
                  <div className="text-[11px] leading-tight" style={{ color: "var(--muted)" }}>{f.label}</div>
                </button>
              );
            })}
          </div>

          {/* per-salesperson rollup — every count drills into the All-leads tab */}
          <SectionTitle>By salesperson</SectionTitle>
          <div className="card p-1 overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr className="micro-cap" style={{ color: "var(--muted)" }}>
              {(tab === "nb"
                ? ["Salesperson", "To contact", "Collecting docs", "In review / UW", "Awaiting info", "Breaching", "Premium in play", "Issued"]
                : ["Salesperson", "At-risk", "Resolving query", "Breaching", "Premium at stake", "Saved"]
              ).map((h) => <th key={h} className="text-left font-normal px-3 py-2">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rollup.map((r) => (
              <tr key={r.owner} style={{ borderTop: "1px solid var(--hairline)" }}>
                <td className="px-3 py-2.5 font-medium" style={r.owner === UNASSIGNED ? { color: "var(--muted)", fontWeight: 400 } : undefined}>{r.owner}</td>
                <td className="px-3 py-2.5">{tab === "nb" ? cell(r.leads, "LEADS", r.owner) : cell(r.atRisk, "RET_ACTIVE", r.owner)}</td>
                {tab === "nb" && <td className="px-3 py-2.5">{cell(r.docs, "DOC_COLLECTION", r.owner)}</td>}
                {tab === "nb" && <td className="px-3 py-2.5">{cell(r.inUw, "IN_UW", r.owner)}</td>}
                {tab === "nb" && <td className="px-3 py-2.5">{cell(r.sentBack, "SENT_BACK", r.owner)}</td>}
                {tab === "ret" && <td className="px-3 py-2.5">{cell(r.queries, "QUERY", r.owner)}</td>}
                <td className="px-3 py-2.5">
                  {r.breaching > 0
                    ? <button className="chip tnum" style={{ background: "#fdeaea", color: "var(--bad)", borderColor: "transparent", cursor: "pointer" }} onClick={() => openList("BREACH", r.owner)}>{r.breaching}</button>
                    : <span className="tnum px-1.5" style={{ color: "var(--muted)" }}>0</span>}
                </td>
                <td className="px-3 py-2.5 tnum">{r.value ? inr(r.value) : "—"}</td>
                <td className="px-3 py-2.5">{cell(r.done, tab === "nb" ? "ISSUED" : "SAVED", r.owner)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        </>
      ) : (
        /* ALL LEADS — paginated, filterable; scales to thousands */
        <>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <SectionTitle hint={`${listed.length}`}>{filter.key ? FILTER_LABEL[filter.key] + (filter.owner ? ` · ${filter.owner}` : "") : tab === "nb" ? "All leads & cases" : "All policies & queries"}</SectionTitle>
            {filter.key && (
              <button className="chip mb-2.5" style={{ background: "#e8f2fb", color: "var(--brand)", borderColor: "transparent", cursor: "pointer" }} onClick={() => { setFilter({ key: null, owner: null }); setPage(0); }}>
                clear filter <X size={11} />
              </button>
            )}
          </div>
          {listed.length === 0 && <div className="card p-5 text-sm" style={{ color: "var(--muted)" }}>Nothing matches this filter.</div>}
          <div className="grid gap-1.5">
            {pageRows.map((r) => <ExecRow key={r.id} r={r} tab={tab} />)}
          </div>
          {pageCount > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4 text-sm">
              <button className="btn btn-sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Prev</button>
              <span className="tnum" style={{ color: "var(--muted)" }}>Page {page + 1} of {pageCount}</span>
              <button className="btn btn-sm" disabled={page >= pageCount - 1} onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}>Next</button>
            </div>
          )}
        </>
      )}
    </>
  );
}

function PipelineInner() {
  const { persona } = usePersona();
  const [tab, setTab] = useState<"nb" | "ret">("nb");
  const { data } = useSWR<{ newBusiness: Row[]; retention: Row[] }>(
    persona ? `/api/pipeline?personaId=${persona.id}&role=${persona.role}` : null,
    fetcher,
    { refreshInterval: 4000 }
  );

  const isSales = persona?.role === "FLS";
  const rows = (tab === "nb" ? data?.newBusiness : data?.retention) ?? [];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <div className="micro-cap" style={{ color: "var(--muted)" }}>{isSales ? "Your book — status of everything assigned to you" : "All regions"}</div>
          <h1 className="display-lg" style={{ color: "var(--navy)" }}>{isSales ? "My Book" : "Pipeline"}</h1>
        </div>
        <div className="flex gap-1 p-1 rounded-full" style={{ background: "#eef2f6" }}>
          <button className="px-4 py-1.5 rounded-full text-[13px] transition" style={{ background: tab === "nb" ? "#fff" : "transparent", fontWeight: tab === "nb" ? 500 : 400, boxShadow: tab === "nb" ? "var(--shadow-1)" : "none" }} onClick={() => setTab("nb")}>New business</button>
          <button className="px-4 py-1.5 rounded-full text-[13px] transition" style={{ background: tab === "ret" ? "#fff" : "transparent", fontWeight: tab === "ret" ? 500 : 400, boxShadow: tab === "ret" ? "var(--shadow-1)" : "none" }} onClick={() => setTab("ret")}>Retention</button>
        </div>
      </div>

      {!data && <div className="text-sm" style={{ color: "var(--muted)" }}>Loading…</div>}
      {data && (isSales ? <SalesBook rows={rows} /> : <ExecView rows={rows} tab={tab} />)}
    </>
  );
}

export default function Page() {
  return <Shell><PipelineInner /></Shell>;
}
