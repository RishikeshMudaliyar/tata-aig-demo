"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Shell } from "@/components/Shell";
import { fetcher, timeAgo } from "@/lib/ui";
import { inr } from "@/lib/domain";
import { SectionTitle } from "@/components/bits";
import { Play, Pause, Radio } from "lucide-react";

type Entity = {
  id: string; href: string; customer: string; product: string; value: number;
  stage: string; owner: string | null; analyst: string | null; uw: string | null;
  holder: string | null; sinceISO: string;
  transitions: { stage: string; at: string }[];
};

// Every column is a STAGE of the lead, named by the activity happening — never a role.
const COLUMNS = [
  { key: "LEAD", label: "To contact", who: "first call" },
  { key: "DOC_COLLECTION", label: "Collecting documents", who: "docs + KYC" },
  { key: "ANALYST_REVIEW", label: "In review", who: "case check" },
  { key: "UW_REVIEW", label: "In underwriting", who: "decision" },
  { key: "SENT_BACK", label: "Awaiting info", who: "back with sales" },
  { key: "ISSUED", label: "Issued", who: "in the book" },
];

/** Which stages sit in which person's bucket — drives the matrix rows. */
function holderFor(e: Entity, stage: string): string | null {
  if (stage === "LEAD" || stage === "DOC_COLLECTION" || stage === "SENT_BACK") return e.owner;
  if (stage === "ANALYST_REVIEW") return e.analyst;
  if (stage === "UW_REVIEW") return e.uw;
  return null;
}

function stageAt(e: Entity, t: number): string | null {
  let cur: string | null = null;
  for (const tr of e.transitions) {
    if (new Date(tr.at).getTime() <= t) cur = tr.stage;
    else break;
  }
  return cur;
}

const STEPS = 1000;

function AdminInner() {
  const { data } = useSWR<{ entities: Entity[]; people: { name: string; role: string }[]; now: string }>(
    "/api/admin", fetcher, { refreshInterval: 5000 }
  );
  const [pos, setPos] = useState(STEPS); // slider position; STEPS = live
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const range = useMemo(() => {
    if (!data) return null;
    const times = data.entities.flatMap((e) => e.transitions.map((t) => new Date(t.at).getTime()));
    if (!times.length) return null;
    return { t0: Math.min(...times), t1: Date.now() };
  }, [data]);

  useEffect(() => {
    if (!playing) { if (timer.current) clearInterval(timer.current); timer.current = null; return; }
    timer.current = setInterval(() => {
      setPos((p) => {
        if (p >= STEPS) { setPlaying(false); return STEPS; }
        return Math.min(STEPS, p + 4);
      });
    }, 40);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [playing]);

  if (!data || !range) return <div className="text-sm" style={{ color: "var(--muted)" }}>Loading control tower…</div>;

  const live = pos >= STEPS;
  const T = live ? Date.now() : range.t0 + (pos / STEPS) * (range.t1 - range.t0);

  // board at time T
  const board: Record<string, Entity[]> = Object.fromEntries(COLUMNS.map((c) => [c.key, []]));
  for (const e of data.entities) {
    const st = live ? e.stage : stageAt(e, T);
    if (st && board[st]) board[st].push(e);
  }

  // person × stage matrix at time T
  const matrix = data.people.map((p) => ({
    person: p,
    cells: COLUMNS.slice(0, 5).map((c) => board[c.key].filter((e) => holderFor(e, c.key) === p.name).length),
    issued: board.ISSUED.filter((e) => e.owner === p.name).length,
  }));

  const tLabel = new Date(T).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <div className="micro-cap" style={{ color: "var(--muted)" }}>All new business · every bucket, live</div>
          <h1 className="display-lg" style={{ color: "var(--navy)" }}>Control Tower</h1>
        </div>
        {live
          ? <span className="chip" style={{ background: "#e2f4e8", color: "var(--good)", borderColor: "transparent" }}><Radio size={11} /> Live</span>
          : <span className="chip" style={{ background: "#fdf3e3", color: "var(--warn)", borderColor: "transparent" }}>Replay · {tLabel}</span>}
      </div>

      {/* WHO HOLDS WHAT — person: how many pending, then which stages they sit at */}
      <SectionTitle hint="how many leads each person holds, and where they're stuck">Pending with each person</SectionTitle>
      <div className="card p-1 mb-6 overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr className="micro-cap" style={{ color: "var(--muted)" }}>
              <th className="text-left font-normal px-3 py-2">Person</th>
              <th className="text-left font-normal px-3 py-2">Total pending</th>
              {COLUMNS.slice(0, 5).map((c, i) => (
                <th key={c.key} className="text-left font-normal px-3 py-2" style={i === 0 ? { borderLeft: "1px solid var(--hairline)" } : undefined}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((r) => {
              const total = r.cells.reduce((s, n) => s + n, 0);
              return (
                <tr key={r.person.name} style={{ borderTop: "1px solid var(--hairline)" }}>
                  <td className="px-3 py-2.5 font-medium">{r.person.name}
                    <span className="text-[11px] ml-1.5" style={{ color: "var(--muted)" }}>{r.person.role === "FLS" ? "Sales" : r.person.role === "ANALYST" ? "Analyst" : "UW"}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="tnum" style={{ fontSize: 17, fontWeight: 600, color: total ? "var(--brand)" : "var(--muted)" }}>{total}</span>
                  </td>
                  {r.cells.map((n, i) => (
                    <td key={i} className="px-3 py-2.5 tnum" style={{ color: n ? "var(--ink)" : "var(--muted)", fontWeight: n ? 500 : 400, borderLeft: i === 0 ? "1px solid var(--hairline)" : undefined }}>
                      {n || "·"}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* KANBAN */}
      <SectionTitle hint={live ? "now" : tLabel}>The board</SectionTitle>
      <div className="grid gap-2.5 mb-5" style={{ gridTemplateColumns: "repeat(6, minmax(170px, 1fr))", overflowX: "auto", alignItems: "start" }}>
        {COLUMNS.map((col, ci) => {
          const color = ["#64748d", "#c77700", "#0072bc", "#6b4fd8", "#d32f2f", "#0c8934"][ci] ?? "#64748d";
          return (
          <div key={col.key} className="rounded-xl p-2" style={{ background: "var(--canvas-soft)", borderTop: `3px solid ${color}`, minHeight: 180 }}>
            <div className="flex items-baseline justify-between px-1.5 pt-1 pb-2">
              <div>
                <div className="text-[12.5px]" style={{ fontWeight: 500, color: "var(--navy)" }}>{col.label}</div>
                <div className="text-[10px]" style={{ color: "var(--muted)" }}>{col.who}</div>
              </div>
              <span className="tnum text-[13px]" style={{ color, fontWeight: 500 }}>{board[col.key].length}</span>
            </div>
            <div className="grid gap-1.5">
              {board[col.key].map((e) => (
                <Link key={`${e.id}-${col.key}`} href={e.href} className="card-flat p-2.5 block slide-in transition hover:-translate-y-px" style={{ background: "#fff" }}>
                  <div className="text-[13px] leading-tight" style={{ fontWeight: 500 }}>{e.customer}</div>
                  <div className="text-[11px] truncate mt-0.5" style={{ color: "var(--muted)" }}>{e.product}</div>
                  <div className="flex items-center justify-between mt-1.5 gap-1">
                    {holderFor(e, col.key)
                      ? <span className="chip" style={{ background: "#e8f2fb", color: "var(--brand)", borderColor: "transparent", fontSize: 10, padding: "1px 7px" }}>{holderFor(e, col.key)?.split(" ")[0]}</span>
                      : <span />}
                    {e.value ? <span className="tnum text-[10.5px]" style={{ color: "var(--muted)" }}>{inr(e.value)}</span> : live && <span className="tnum text-[10.5px]" style={{ color: "var(--muted)" }}>{timeAgo(e.sinceISO)}</span>}
                  </div>
                </Link>
              ))}
              {board[col.key].length === 0 && <div className="text-center text-[11px] py-4" style={{ color: "var(--ink-mute)" }}>—</div>}
            </div>
          </div>
          );
        })}
      </div>

      {/* TIME-LAPSE */}
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <button className="btn btn-sm" style={{ minWidth: 92 }}
            onClick={() => { if (playing) { setPlaying(false); } else { if (pos >= STEPS) setPos(0); setPlaying(true); } }}>
            {playing ? <Pause size={14} /> : <Play size={14} />} {playing ? "Pause" : "Replay"}
          </button>
          <input
            type="range" min={0} max={STEPS} value={pos}
            onChange={(ev) => { setPlaying(false); setPos(Number(ev.target.value)); }}
            className="flex-1"
            style={{ accentColor: "var(--brand)" }}
          />
          <button className="btn btn-sm btn-ghost tnum" style={{ color: live ? "var(--good)" : "var(--brand)" }} onClick={() => { setPlaying(false); setPos(STEPS); }}>
            {live ? "● Live" : "Jump to live"}
          </button>
        </div>
        <div className="flex justify-between mt-1.5 px-1 text-[10.5px] tnum" style={{ color: "var(--muted)" }}>
          <span>{new Date(range.t0).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
          <span>{live ? "now" : tLabel}</span>
          <span>now</span>
        </div>
      </div>
    </>
  );
}

export default function Page() {
  return <Shell><AdminInner /></Shell>;
}
