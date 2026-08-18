"use client";
import { Suspense } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Shell } from "@/components/Shell";
import { usePersona } from "@/components/PersonaProvider";
import { fetcher } from "@/lib/ui";
import { LeadCopilot } from "@/components/LeadCopilot";
import { ArrowLeft } from "lucide-react";

function LeadInner() {
  const params = useSearchParams();
  const id = params.get("id");
  const router = useRouter();
  const { persona } = usePersona();
  const { data } = useSWR<{ lead: any; applicationId: string | null }>(id ? `/api/leads?id=${id}` : null, fetcher);

  if (!data?.lead) return <div className="text-sm" style={{ color: "var(--muted)" }}>Loading lead…</div>;
  const lead = data.lead;

  // already converted → jump to the case
  if (lead.status === "CONVERTED" && data.applicationId) {
    router.replace(`/case?id=${data.applicationId}`);
    return null;
  }

  const canAct = persona?.role === "FLS" && persona?.id === lead.ownerId;

  return (
    <div className="fade-in max-w-3xl mx-auto">
      <Link href="/cockpit" className="inline-flex items-center gap-1 text-sm mb-3" style={{ color: "var(--muted)" }}><ArrowLeft size={15} /> My Day</Link>
      <LeadCopilot
        lead={lead}
        canAct={canAct}
        personaId={persona?.id}
        onConverted={(appId) => router.push(`/case?id=${appId}&welcome=1`)}
      />
    </div>
  );
}

export default function Page() {
  return (
    <Shell>
      <Suspense fallback={<div className="text-sm" style={{ color: "var(--muted)" }}>Loading…</div>}>
        <LeadInner />
      </Suspense>
    </Shell>
  );
}
