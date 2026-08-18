"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Shell } from "@/components/Shell";
import { usePersona } from "@/components/PersonaProvider";
import { InlineCasePanel } from "@/components/InlineCasePanel";
import { ArrowLeft } from "lucide-react";

function CaseInner() {
  const params = useSearchParams();
  const id = params.get("id");
  const { persona } = usePersona();
  const backHref = persona?.role === "ANALYST" || persona?.role === "UNDERWRITER" ? "/underwriting" : "/cockpit";

  if (!id) return <div className="text-sm" style={{ color: "var(--muted)" }}>No case selected.</div>;

  return (
    <div className="fade-in max-w-4xl mx-auto">
      <Link href={backHref} className="inline-flex items-center gap-1 text-sm mb-3" style={{ color: "var(--muted)" }}><ArrowLeft size={15} /> Back</Link>
      <InlineCasePanel applicationId={id} personaId={persona?.id} role={persona?.role} showReset />
    </div>
  );
}

export default function Page() {
  return (
    <Shell>
      <Suspense fallback={<div className="text-sm" style={{ color: "var(--muted)" }}>Loading…</div>}>
        <CaseInner />
      </Suspense>
    </Shell>
  );
}
