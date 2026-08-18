"use client";
import { useState } from "react";
import { moduleMeta } from "@/lib/domain";
import { cn } from "@/lib/ui";
import { Volume2, Square } from "lucide-react";

/** Module provenance chip — neutral for core modules, blue tint only for the AI overlay. */
export function ModuleChip({ module, className }: { module: string; className?: string }) {
  const m = moduleMeta(module);
  const overlay = "overlay" in m && m.overlay;
  return (
    <span className={cn("chip", className)}
      style={overlay
        ? { color: "var(--brand)", borderColor: "#c9dff2", background: "#e8f2fb" }
        : { color: "var(--ink-mute)", borderColor: "var(--hairline)", background: "var(--canvas-soft)" }}>
      {m.label}
    </span>
  );
}

export function ProvenanceRow({ modules, label }: { modules: string[]; label?: string }) {
  if (!modules?.length) return null;
  const canonical = Array.from(new Set(modules.map((m) => moduleMeta(m).key)));
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {label && <span className="micro-cap" style={{ color: "var(--muted)" }}>{label}</span>}
      {canonical.map((m) => (
        <ModuleChip key={m} module={m} />
      ))}
    </div>
  );
}

export function Priority({ level }: { level: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    HIGH: { bg: "#fdeaea", fg: "var(--bad)", label: "High" },
    MEDIUM: { bg: "#fdf3e3", fg: "var(--warn)", label: "Medium" },
    LOW: { bg: "#eef2f6", fg: "var(--ink-mute)", label: "Low" },
  };
  const s = map[level] ?? map.LOW;
  return <span className="chip" style={{ background: s.bg, color: s.fg, borderColor: "transparent" }}>{s.label}</span>;
}

export function RiskBadge({ score }: { score: number }) {
  const color = score >= 85 ? "#d32f2f" : score >= 70 ? "#c77700" : "#64748d";
  return (
    <span className="chip tnum" style={{ color, borderColor: `${color}33`, background: `${color}0f` }}>
      Lapse risk {score}
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    ISSUED: "#0c8934", SAVED: "#0c8934", REVIVED: "#0c8934", IN_FORCE: "#0c8934", CLEARED: "#0c8934",
    REQUIREMENT_RAISED: "#c77700", REQUIREMENTS_OUT: "#c77700", GRACE: "#c77700", UNDER_REVIEW: "#005eac", RE_REVIEW: "#005eac", IN_PROGRESS: "#005eac",
    NIGO: "#d32f2f", LAPSED: "#d32f2f", DECLINED: "#d32f2f", AT_RISK: "#d32f2f",
  };
  const c = map[status] ?? "#64748d";
  return <span className="chip" style={{ color: c, borderColor: `${c}33`, background: `${c}0f` }}>{status.replace(/_/g, " ")}</span>;
}

/** Voice-assist button: speaks a brief aloud using the browser Web Speech API. */
export function SpeakButton({ text, label = "Voice brief", langHint }: { text: string; label?: string; langHint?: string }) {
  const [speaking, setSpeaking] = useState(false);
  const speak = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    if (speaking) { setSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance(text.replace(/[•\n]/g, ". "));
    const lang = (langHint || "").toLowerCase();
    u.lang = lang.includes("hindi") || lang.includes("marathi") ? "hi-IN" : lang.includes("tamil") ? "ta-IN" : lang.includes("telugu") ? "te-IN" : "en-IN";
    u.rate = 1.0; u.pitch = 1.0;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  };
  return (
    <button className={cn("btn btn-sm", speaking && "btn-accent")} onClick={speak} type="button">
      {speaking ? <Square size={14} /> : <Volume2 size={14} />}
      {speaking ? "Stop" : label}
    </button>
  );
}

/** A semicircular gauge for the persistency / retention story. */
export function Gauge({ value, max = 100, label, sub }: { value: number; max?: number; label: string; sub?: string }) {
  const pct = Math.max(0, Math.min(1, value / max));
  const angle = pct * 180;
  const r = 70, cx = 90, cy = 90;
  const rad = (deg: number) => (deg - 180) * (Math.PI / 180);
  const x = cx + r * Math.cos(rad(angle));
  const y = cy + r * Math.sin(rad(angle));
  const large = angle > 180 ? 1 : 0;
  return (
    <div className="flex flex-col items-center">
      <svg width="180" height="104" viewBox="0 0 180 104">
        <path d={`M 20 90 A ${r} ${r} 0 0 1 160 90`} fill="none" stroke="var(--hairline)" strokeWidth="14" strokeLinecap="round" />
        <path d={`M 20 90 A ${r} ${r} 0 ${large} 1 ${x} ${y}`} fill="none" stroke="url(#g)" strokeWidth="14" strokeLinecap="round" />
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ff6f00" />
            <stop offset="100%" stopColor="#0c8934" />
          </linearGradient>
        </defs>
        <text x="90" y="82" textAnchor="middle" fontSize="32" fontWeight="300" letterSpacing="-0.6" fill="var(--ink)" style={{ fontFeatureSettings: "'tnum'" }}>{value}</text>
      </svg>
      <div className="text-sm font-semibold -mt-2">{label}</div>
      {sub && <div className="text-xs" style={{ color: "var(--muted)" }}>{sub}</div>}
    </div>
  );
}

export function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between mb-2.5">
      <h2 className="micro-cap" style={{ color: "var(--ink-mute)" }}>{children}</h2>
      {hint && <span className="text-[11px]" style={{ color: "var(--ink-mute)", opacity: 0.8 }}>{hint}</span>}
    </div>
  );
}
