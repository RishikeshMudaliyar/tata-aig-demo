"use client";
import useSWR from "swr";
import Link from "next/link";
import { Shell } from "@/components/Shell";
import { usePersona } from "@/components/PersonaProvider";
import { fetcher } from "@/lib/ui";
import { inr } from "@/lib/domain";
import { SectionTitle } from "@/components/bits";
import { ArrowRight } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  DOC_COLLECTION: "Collecting documents",
  ANALYST_REVIEW: "For your review",
  UW_REVIEW: "For decision",
  SENT_BACK: "With sales — sent back",
  ISSUED: "Issued",
};

function QueueInner() {
  const { persona } = usePersona();
  const { data } = useSWR<{ applications: any[] }>(
    persona ? `/api/applications?personaId=${persona.id}&role=${persona.role}` : null,
    fetcher,
    { refreshInterval: 4000 }
  );

  const actionable = (s: string) =>
    (persona?.role === "ANALYST" && s === "ANALYST_REVIEW") || (persona?.role === "UNDERWRITER" && s === "UW_REVIEW");

  return (
    <>
      <div className="mb-5">
        <div className="micro-cap" style={{ color: "var(--muted)" }}>{persona?.role === "ANALYST" ? "Risk Ops" : "Underwriter"}</div>
        <h1 className="display-lg" style={{ color: "var(--navy)" }}>Work queue</h1>
      </div>

      <SectionTitle>Cases</SectionTitle>
      <div className="grid gap-2.5">
        {!data && <div className="text-sm" style={{ color: "var(--muted)" }}>Loading…</div>}
        {data?.applications.length === 0 && <div className="card p-6 text-sm" style={{ color: "var(--muted)" }}>No cases.</div>}
        {data?.applications.map((a) => (
          <Link key={a.id} href={`/case?id=${a.id}`} className="card p-4 hover:-translate-y-0.5 transition">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{a.customer.name} <span className="font-normal" style={{ color: "var(--muted)" }}>· {a.product}</span></div>
                <div className="text-sm tnum" style={{ color: "var(--muted)" }}>{inr(a.sumAssured)} cover · {a.refNo}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="chip" style={actionable(a.status) ? { background: "#e8f2fb", color: "var(--brand)", borderColor: "transparent" } : {}}>{STATUS_LABEL[a.status] ?? a.status}</span>
                <ArrowRight size={16} style={{ color: "var(--muted)" }} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

export default function Page() {
  return <Shell><QueueInner /></Shell>;
}
