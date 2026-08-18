"use client";
import useSWR from "swr";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetcher } from "@/lib/ui";
import { usePersona } from "@/components/PersonaProvider";
import { ROLE_LABEL, type Role } from "@/lib/domain";
import { ChevronRight, Lock, RotateCcw, Check, ArrowRight } from "lucide-react";

type P = { id: string; name: string; role: string; title: string; initials: string; region?: string | null; branch?: string | null };

export default function Home() {
  const { data, mutate } = useSWR<{ personas: P[] }>("/api/personas", fetcher);
  const { setPersona } = usePersona();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState<string | null>(null);
  const [resetState, setResetState] = useState<"idle" | "busy" | "done">("idle");

  const resetAll = async () => {
    setResetState("busy");
    await fetch("/api/demo", { method: "POST" });
    await mutate();
    setResetState("done");
    setTimeout(() => setResetState("idle"), 4000);
  };

  const pick = (p: P) => {
    setSigningIn(p.id);
    setPersona({ id: p.id, name: p.name, role: p.role, title: p.title, initials: p.initials, region: p.region, branch: p.branch });
    router.push(p.role === "ADMIN" ? "/admin" : p.role === "LEADERSHIP" ? "/pipeline" : "/cockpit");
  };

  return (
    <div className="min-h-dvh flex flex-col lg:flex-row">
      {/* LEFT — brand panel */}
      <div className="relative lg:w-[45%] lg:min-h-dvh overflow-hidden flex flex-col justify-between p-8 lg:p-12" style={{ background: "var(--brand)" }}>
        <div className="mesh absolute inset-0" style={{ opacity: 0.1 }} />
        <div className="relative flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/tata-aig-logo.png" alt="Tata AIG" style={{ height: 56, width: "auto" }} />
          <div className="micro-cap pl-3" style={{ color: "rgba(255,255,255,0.75)", borderLeft: "1px solid rgba(255,255,255,0.3)" }}>Unified Sales Platform</div>
        </div>

        <div className="relative py-10 lg:py-0">
          <h1 className="display-xl text-white" style={{ maxWidth: 480 }}>
            One intelligent layer over your existing systems.
          </h1>
          <p className="text-[15px] leading-relaxed mt-4" style={{ color: "rgba(255,255,255,0.7)", maxWidth: 400 }}>
            A composed workspace for every role — from first call to issued policy.
          </p>
          <a href="/architecture"
            className="inline-flex items-center gap-2 mt-8 rounded-lg text-[15px] transition"
            style={{ background: "rgba(255,255,255,0.12)", color: "#fff", padding: "12px 20px", border: "1px solid rgba(255,255,255,0.35)" }}>
            See the platform architecture <ArrowRight size={17} />
          </a>
        </div>

        <div className="relative">
          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>Working demo · synthetic data</span>
        </div>
      </div>

      {/* RIGHT — sign in */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12" style={{ background: "var(--canvas)" }}>
        <div className="w-full" style={{ maxWidth: 460 }}>
          <h2 className="display-md mb-1" style={{ color: "var(--navy)" }}>Sign in</h2>
          <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>Choose a workspace account. Single sign-on in production; role picker in this demo.</p>

          <div className="card overflow-hidden divide-y" style={{ borderColor: "var(--hairline)" }}>
            {!data && <div className="p-5 text-sm" style={{ color: "var(--ink-mute)" }}>Loading accounts…</div>}
            {data?.personas.map((p) => (
              <button key={p.id} onClick={() => pick(p)} disabled={signingIn !== null}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition hover:bg-[#f6f9fc]"
                style={{ borderColor: "var(--hairline)", opacity: signingIn && signingIn !== p.id ? 0.5 : 1 }}>
                <div className="grid place-items-center rounded-full text-[13px] shrink-0" style={{ width: 38, height: 38, background: "var(--brand)", color: "#fff", fontWeight: 500 }}>{p.initials}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[14px] truncate">{p.name}</div>
                  <div className="text-[12.5px] truncate" style={{ color: "var(--ink-mute)" }}>{p.title}</div>
                </div>
                <span className="chip shrink-0" style={{ background: "#e8f2fb", color: "var(--brand)", borderColor: "transparent" }}>{ROLE_LABEL[p.role as Role] ?? p.role}</span>
                <ChevronRight size={15} className="shrink-0" style={{ color: "var(--ink-mute)" }} />
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--ink-mute)" }}>
              <Lock size={12} /> Role-based access — each account sees only its own queue and actions.
            </div>
            <button onClick={resetAll} disabled={resetState !== "idle" || signingIn !== null}
              className="flex items-center gap-1.5 text-[12px] shrink-0 transition"
              style={{ color: resetState === "done" ? "var(--good)" : "var(--ink-mute)", cursor: resetState === "idle" ? "pointer" : "default" }}>
              {resetState === "done" ? <Check size={12} /> : <RotateCcw size={12} className={resetState === "busy" ? "animate-spin" : ""} />}
              {resetState === "busy" ? "Resetting…" : resetState === "done" ? "Demo data reset" : "Reset demo data"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
