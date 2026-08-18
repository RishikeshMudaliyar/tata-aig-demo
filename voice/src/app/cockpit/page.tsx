"use client";
import { useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { usePersona } from "@/components/PersonaProvider";
import { fetcher, action } from "@/lib/ui";
import { ROLE_LABEL, type Role } from "@/lib/domain";
import { Priority, ProvenanceRow, SectionTitle } from "@/components/bits";
import { LeadCopilot } from "@/components/LeadCopilot";
import { InlineCasePanel } from "@/components/InlineCasePanel";
import { useIsMobile } from "@/lib/useIsMobile";
import { ArrowRight, Check, HeartPulse, GitBranch, Wrench, ChevronRight } from "lucide-react";
import type { ComposedTask } from "@/lib/orchestration/composer";

const KIND_LABEL: Record<string, string> = {
  LEAD_CALL: "Lead", COLLECT_DOCS: "Documents", RESOLVE_SENDBACK: "Send-back",
  ANALYST_REVIEW: "Case review", UW_DECIDE: "Decision", SAVE: "Retention",
  REASSIGN: "Retention", TICKET: "Servicing", NUDGE: "Coaching", REVIEW: "Portfolio", REVIEW_PIPELINE: "Portfolio",
};
const CASE_KINDS = ["COLLECT_DOCS", "RESOLVE_SENDBACK", "ANALYST_REVIEW", "UW_DECIDE"];

/** On mobile, each queue item navigates to a full-screen detail page. */
function mobileHref(t: ComposedTask): string {
  if (t.kind === "LEAD_CALL" && t.relatedId) return `/lead?id=${t.relatedId}`;
  if (CASE_KINDS.includes(t.kind) && t.relatedId) return `/case?id=${t.relatedId}`;
  if (t.kind === "REVIEW_PIPELINE" || t.kind === "REVIEW") return "/pipeline";
  if (t.kind === "NUDGE") return t.relatedId ?? "/cockpit";
  return "/lapse";
}

export default function CockpitPage() {
  const { persona, setPersona } = usePersona();
  const router = useRouter();
  const { data, mutate } = useSWR<{ persona: any; tasks?: ComposedTask[]; modulesUsed?: string[]; error?: string }>(
    persona ? `/api/cockpit?personaId=${persona.id}` : null,
    fetcher,
    { refreshInterval: 4000 }
  );

  useEffect(() => {
    if (data?.error) { setPersona(null); router.replace("/"); }
  }, [data?.error, setPersona, router]);

  // leadership has a single, dedicated view — never the task cockpit
  useEffect(() => {
    if (persona?.role === "LEADERSHIP") router.replace("/pipeline");
  }, [persona?.role, router]);

  const tasks = data?.tasks ?? null;

  return (
    <Shell>
      {persona && (
        <div className="mb-5 fade-in">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="micro-cap" style={{ color: "var(--muted)" }}>{ROLE_LABEL[persona.role as Role] ?? persona.role} · {persona.branch ?? persona.region ?? "Bajaj Life"}</div>
              <h1 className="display-lg mt-0.5" style={{ color: "var(--navy)" }}>{greeting()}, {firstName(persona.name)}.</h1>
            </div>
            {data?.modulesUsed && <ProvenanceRow modules={data.modulesUsed} />}
          </div>
        </div>
      )}
      <Workspace tasks={tasks} persona={persona} onChanged={mutate} />
    </Shell>
  );
}

/* ---------- Universal master-detail workspace (all roles) ---------- */
function Workspace({ tasks, persona, onChanged }: { tasks: ComposedTask[] | null; persona: any; onChanged: () => void }) {
  const isMobile = useIsMobile();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [forcedCaseId, setForcedCaseId] = useState<string | null>(null);

  useEffect(() => {
    if (isMobile || !tasks || forcedCaseId) return;
    if (!selectedId || !tasks.some((t) => t.id === selectedId)) setSelectedId(tasks[0]?.id ?? null);
  }, [isMobile, tasks, selectedId, forcedCaseId]);

  const select = (id: string) => { setSelectedId(id); setForcedCaseId(null); };
  const selected = tasks?.find((t) => t.id === selectedId) ?? null;

  const rightLabel = forcedCaseId || (selected && CASE_KINDS.includes(selected.kind)) ? "Case"
    : selected?.kind === "LEAD_CALL" ? "Lead copilot"
    : selected?.kind === "SAVE" || selected?.kind === "REASSIGN" ? "Retention"
    : selected?.kind === "TICKET" ? "Servicing"
    : selected?.kind?.startsWith("REVIEW") ? "Portfolio"
    : "Detail";

  // MOBILE: list only — tapping pushes a full-screen detail page (native drill-in)
  if (isMobile) {
    return (
      <>
        <SectionTitle hint="only what needs you">Action queue</SectionTitle>
        <div className="grid gap-2.5">
          {!tasks && <div className="text-sm" style={{ color: "var(--muted)" }}>Loading…</div>}
          {tasks?.length === 0 && <div className="card p-6 text-sm" style={{ color: "var(--muted)" }}>All clear — nothing needs you right now.</div>}
          {tasks?.map((t) => (
            <Link key={t.id} href={mobileHref(t)} className="card p-4 flex items-start gap-3 slide-in">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Priority level={t.priority} />
                  <span className="chip">{KIND_LABEL[t.kind] ?? t.kind}</span>
                </div>
                <div className="font-semibold leading-snug">{t.title}</div>
                {t.detail && <div className="text-sm mt-0.5 tnum" style={{ color: "var(--muted)" }}>{t.detail}</div>}
              </div>
              <ChevronRight size={18} style={{ color: "var(--ink-mute)" }} className="mt-1 shrink-0" />
            </Link>
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="grid lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] gap-4">
      {/* LEFT: the list */}
      <div>
        <SectionTitle hint="only what needs you">Action queue</SectionTitle>
        <div className="grid gap-2">
          {!tasks && <div className="text-sm" style={{ color: "var(--muted)" }}>Loading…</div>}
          {tasks?.length === 0 && <div className="card p-6 text-sm" style={{ color: "var(--muted)" }}>All clear — nothing needs you right now.</div>}
          {tasks?.map((t) => {
            const active = t.id === selectedId && !forcedCaseId;
            return (
              <button key={t.id} onClick={() => select(t.id)} className="card p-3 text-left transition slide-in"
                style={{ outline: active ? "2px solid var(--brand)" : "none" }}>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Priority level={t.priority} />
                  <span className="chip">{KIND_LABEL[t.kind] ?? t.kind}</span>
                </div>
                <div className="font-semibold text-sm leading-snug">{t.title}</div>
                {t.detail && <div className="text-xs mt-0.5 tnum" style={{ color: "var(--muted)" }}>{t.detail}</div>}
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT: the detail, inline */}
      <div className="lg:sticky lg:top-[72px] self-start w-full">
        <SectionTitle>{rightLabel}</SectionTitle>
        {forcedCaseId ? (
          <InlineCasePanel applicationId={forcedCaseId} personaId={persona?.id} role={persona?.role} onChanged={onChanged} />
        ) : !selected ? (
          <div className="card p-8 text-sm text-center" style={{ color: "var(--muted)" }}>Select an item to see what to do.</div>
        ) : selected.kind === "LEAD_CALL" && selected.relatedId ? (
          <LeadDetail leadId={selected.relatedId} personaId={persona?.id} onConverted={(appId) => { setForcedCaseId(appId); onChanged(); }} />
        ) : CASE_KINDS.includes(selected.kind) && selected.relatedId ? (
          <InlineCasePanel applicationId={selected.relatedId} personaId={persona?.id} role={persona?.role} onChanged={onChanged} />
        ) : (
          <GenericDetail task={selected} onChanged={onChanged} />
        )}
      </div>
    </div>
  );
}

function LeadDetail({ leadId, personaId, onConverted }: { leadId: string; personaId?: string; onConverted: (appId: string) => void }) {
  const { data } = useSWR<{ lead: any; applicationId: string | null }>(`/api/leads?id=${leadId}`, fetcher);
  useEffect(() => {
    if (data?.lead?.status === "CONVERTED" && data.applicationId) onConverted(data.applicationId);
  }, [data, onConverted]);
  if (!data?.lead) return <div className="card p-6 text-sm" style={{ color: "var(--muted)" }}>Loading lead…</div>;
  const canAct = data.lead.ownerId === personaId;
  return <LeadCopilot lead={data.lead} canAct={canAct} personaId={personaId} onConverted={onConverted} />;
}

/* Retention / servicing / portfolio items — summary + the right action or a jump. */
function GenericDetail({ task, onChanged }: { task: ComposedTask; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const runQuick = async () => {
    if (!task.quick) return;
    setBusy(true);
    await action(task.quick.api, task.quick.body);
    setDone(true); setBusy(false);
    setTimeout(onChanged, 700);
  };

  const meta: Record<string, { icon: React.ReactNode; href?: string; hrefLabel?: string }> = {
    SAVE: { icon: <HeartPulse size={16} style={{ color: "var(--bad)" }} />, href: "/lapse", hrefLabel: "Open the save workflow" },
    REASSIGN: { icon: <HeartPulse size={16} style={{ color: "var(--bad)" }} />, href: "/lapse", hrefLabel: "Open in Retention" },
    TICKET: { icon: <Wrench size={16} style={{ color: "var(--brand)" }} /> },
    REVIEW: { icon: <GitBranch size={16} style={{ color: "var(--brand)" }} />, href: "/pipeline", hrefLabel: "Open Pipeline" },
    REVIEW_PIPELINE: { icon: <GitBranch size={16} style={{ color: "var(--brand)" }} />, href: "/pipeline", hrefLabel: "Open Pipeline" },
  };
  const m = meta[task.kind] ?? { icon: <GitBranch size={16} style={{ color: "var(--brand)" }} /> };

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-2">{m.icon}<span className="font-semibold">{task.title}</span></div>
      {task.detail && <div className="text-sm tnum mb-4" style={{ color: "var(--muted)" }}>{task.detail}</div>}
      <div className="mb-4"><ProvenanceRow modules={task.sourceModules} /></div>
      {task.quick ? (
        done ? (
          <span className="chip" style={{ background: "#e2f4e8", color: "var(--good)", borderColor: "transparent" }}><Check size={12} /> Done</span>
        ) : (
          <button className="btn btn-primary" disabled={busy} onClick={runQuick}>{busy ? "…" : task.quick.label}</button>
        )
      ) : m.href ? (
        <Link href={m.href} className="btn btn-primary"><span className="flex items-center gap-2">{m.hrefLabel} <ArrowRight size={15} /></span></Link>
      ) : null}
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
function firstName(full: string) {
  const parts = full.split(" ").filter((p) => !/^(dr|mr|ms|mrs)\.?$/i.test(p));
  return parts[0] ?? full;
}
