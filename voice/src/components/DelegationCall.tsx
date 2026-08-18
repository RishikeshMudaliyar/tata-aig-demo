"use client";

/**
 * The "Delegate to AI" surface: Riya's phone on the left, the customer's on the right,
 * a live connector between them, and each side's speech staying on its own handset.
 *
 * Both sides are really transcribed by the platform — the transcription event carries the
 * participant, so lines are attributed rather than guessed.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Mic, MicOff, PhoneOff, Phone, X, Check } from "lucide-react";
import { useVoiceCall, type Line } from "@/lib/useVoiceCall";

const TATA_AIG_LINE = "+91 22 6693 8200";

/** The five facts Riya is sent to collect — they light up as she gets them. */
const FACTS = [
  { key: "need", label: "need", hints: [/zaroorat|requirement|chahiye|cover chahi|abhi bhi/i] },
  { key: "dependants", label: "dependants", hints: [/wife|husband|bachch|children|parents|family|patni|beta|beti/i] },
  { key: "income", label: "income", hints: [/lakh|income|salary|kamata|kamati|annual/i] },
  { key: "cover", label: "existing cover", hints: [/policy|insurance|LIC|office se|employer|group cover/i] },
  { key: "urgency", label: "urgency", hints: [/mahine|month|jaldi|abhi|explore|dekh raha|soch/i] },
];

function Handset({
  title,
  subtitle,
  number,
  tone,
  lines,
  speaking,
  ringing,
  footer,
}: {
  title: string;
  subtitle: string;
  number: string;
  tone: "agent" | "customer";
  lines: Line[];
  speaking: boolean;
  ringing?: boolean;
  footer?: React.ReactNode;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  const isAgent = tone === "agent";

  return (
    <div
      className="rounded-[34px] p-2.5 transition-shadow"
      style={{
        width: 300,
        background: "#0b1a2c",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: speaking
          ? "0 0 0 2px rgba(127,209,160,0.55), 0 18px 40px rgba(0,0,0,0.45)"
          : "0 18px 40px rgba(0,0,0,0.40)",
      }}
    >
      <div
        className="rounded-[26px] flex flex-col overflow-hidden"
        style={{ height: 520, background: isAgent ? "#0e2743" : "#f4f7fa" }}
      >
        {/* earpiece */}
        <div className="flex justify-center pt-2.5 pb-1">
          <span className="block rounded-full" style={{ width: 44, height: 4, background: isAgent ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.14)" }} />
        </div>

        {/* who */}
        <div className="px-4 pt-2 pb-3 text-center">
          <div
            className="mx-auto mb-2 grid place-items-center rounded-full text-[15px]"
            style={{
              width: 52, height: 52,
              background: isAgent ? "rgba(255,255,255,0.14)" : "#dbe6f1",
              color: isAgent ? "#fff" : "#0b2447",
            }}
          >
            {title.slice(0, 1)}
          </div>
          <div className="text-[15px]" style={{ color: isAgent ? "#fff" : "#0b2447" }}>{title}</div>
          <div className="text-[11.5px] mt-0.5" style={{ color: isAgent ? "rgba(255,255,255,0.55)" : "#64748d" }}>
            {subtitle}
          </div>
          <div className="text-[12px] mt-1 tnum" style={{ color: isAgent ? "rgba(255,255,255,0.4)" : "#8a97ab" }}>
            {number}
          </div>
        </div>

        {/* transcript */}
        <div ref={scroller} className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5 scrollbar-thin">
          {ringing && (
            <div className="h-full grid place-items-center">
              <span className="text-[13px]" style={{ color: isAgent ? "rgba(255,255,255,0.6)" : "#64748d" }}>
                {isAgent ? "Dialling…" : "Incoming call…"}
              </span>
            </div>
          )}
          {lines.map((l) => (
            <div
              key={l.id}
              className="rounded-2xl px-3 py-2 text-[13px] leading-snug fade-in"
              style={{
                background: isAgent ? "rgba(255,255,255,0.12)" : "#ffffff",
                color: isAgent ? "#eaf2fb" : "#0b2447",
                border: isAgent ? "none" : "1px solid #e3e8ee",
              }}
            >
              {l.text}
            </div>
          ))}
        </div>

        {footer}

        {/* home indicator */}
        <div className="flex justify-center pb-2 pt-1">
          <span className="block rounded-full" style={{ width: 92, height: 4, background: isAgent ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.18)" }} />
        </div>
      </div>
    </div>
  );
}

export function DelegationCall({
  leadName,
  leadPhone,
  salespersonName,
  contextNote,
  variables,
  onClose,
}: {
  leadName: string;
  leadPhone: string;
  salespersonName: string;
  contextNote?: string;
  variables?: Record<string, string>;
  onClose: () => void;
}) {
  const call = useVoiceCall("QUALIFIER", variables);
  const [speaker, setSpeaker] = useState<"agent" | "you" | null>(null);

  // Who is talking right now — drives the connector direction and the handset glow.
  useEffect(() => {
    if (call.phase !== "live") return setSpeaker(null);
    const id = setInterval(() => {
      const a = call.agentLevel.current;
      const m = call.micLevel.current;
      setSpeaker(a > 0.05 && a >= m ? "agent" : m > 0.06 ? "you" : null);
    }, 110);
    return () => clearInterval(id);
  }, [call.phase, call.agentLevel, call.micLevel]);

  const agentLines = useMemo(() => call.lines.filter((l) => l.who === "agent"), [call.lines]);
  const yourLines = useMemo(() => call.lines.filter((l) => l.who === "you"), [call.lines]);

  const captured = useMemo(() => {
    const said = call.lines.map((l) => l.text).join(" ");
    return new Set(FACTS.filter((f) => f.hints.some((h) => h.test(said))).map((f) => f.key));
  }, [call.lines]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") void call.teardown().then(onClose);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [call, onClose]);

  const ringing = call.phase === "dialling" || call.phase === "connecting";

  const stage = (
    <div className="fixed inset-0 z-[200] flex flex-col call-stage">
      {/* header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <div className="text-[15px] text-white">Outbound call</div>
          <div className="text-[12px]" style={{ color: "rgba(255,255,255,0.6)" }}>
            AI calling on behalf of {salespersonName}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {call.phase === "live" && (
            <span className="tnum text-[13px]" style={{ color: "rgba(255,255,255,0.72)" }}>{call.mmss}</span>
          )}
          <button onClick={() => void call.teardown().then(onClose)} aria-label="Close" className="p-1">
            <X size={20} color="rgba(255,255,255,0.75)" />
          </button>
        </div>
      </div>

      {/* phones */}
      <div className="flex-1 flex items-center justify-center gap-2 px-6 overflow-y-auto">
        <Handset
          title="Riya"
          subtitle="AI agent · Tata AIG"
          number={TATA_AIG_LINE}
          tone="agent"
          lines={agentLines}
          speaking={speaker === "agent"}
          ringing={ringing}
        />

        {/* connector */}
        <div className="flex flex-col items-center justify-center" style={{ width: 96 }}>
          <div className="relative" style={{ width: 72, height: 2, background: "rgba(255,255,255,0.16)" }}>
            {call.phase === "live" && speaker && (
              <span
                className={speaker === "agent" ? "signal-right" : "signal-left"}
                style={{
                  position: "absolute", top: -3, width: 8, height: 8, borderRadius: 999,
                  background: speaker === "agent" ? "#8ab6e8" : "#7fd1a0",
                }}
              />
            )}
          </div>
          <div className="mt-2 text-[11px] text-center" style={{ color: "rgba(255,255,255,0.5)" }}>
            {call.phase === "live"
              ? speaker === "agent" ? "Riya speaking" : speaker === "you" ? "you speaking" : "connected"
              : ringing ? "ringing" : "not connected"}
          </div>
        </div>

        <Handset
          title={leadName}
          subtitle="Customer · you"
          number={leadPhone}
          tone="customer"
          lines={yourLines}
          speaking={speaker === "you"}
          ringing={ringing}
        />
      </div>

      {/* capture strip */}
      <div className="px-6">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-2 pb-3">
          <span className="text-[11px] uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.4)" }}>
            capturing
          </span>
          {FACTS.map((f) => {
            const got = captured.has(f.key);
            return (
              <span
                key={f.key}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] transition"
                style={{
                  background: got ? "rgba(127,209,160,0.18)" : "rgba(255,255,255,0.07)",
                  color: got ? "#a9e6c3" : "rgba(255,255,255,0.45)",
                }}
              >
                {got && <Check size={12} />} {f.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* controls */}
      <div className="flex flex-col items-center gap-3 pb-8">
        {call.phase === "idle" && contextNote && (
          <p className="max-w-lg text-center text-[13px]" style={{ color: "rgba(255,255,255,0.6)" }}>{contextNote}</p>
        )}
        {call.phase === "error" && (
          <p className="max-w-lg text-center text-[13px]" style={{ color: "#ffb4ab" }}>{call.error}</p>
        )}
        {call.micBlocked && call.phase === "live" && (
          <p className="text-[12px]" style={{ color: "#f0c06a" }}>Microphone blocked — the customer side cannot be heard.</p>
        )}

        <div className="flex items-center gap-3">
          {(call.phase === "idle" || call.phase === "ended" || call.phase === "error") && (
            <button className="btn btn-primary" onClick={() => void call.start()}>
              <Phone size={16} /> {call.phase === "idle" ? "Place the call" : "Call again"}
            </button>
          )}
          {(call.phase === "live" || ringing) && (
            <>
              <button
                className="grid h-12 w-12 place-items-center rounded-full"
                style={{ background: call.muted ? "#fff" : "rgba(255,255,255,0.14)" }}
                onClick={() => void call.toggleMute()}
                aria-label={call.muted ? "Unmute" : "Mute"}
              >
                {call.muted ? <MicOff size={18} color="#0b2447" /> : <Mic size={18} color="#fff" />}
              </button>
              <button
                className="grid h-12 w-12 place-items-center rounded-full"
                style={{ background: "#d32f2f" }}
                onClick={() => void call.hangUp()}
                aria-label="End call"
              >
                <PhoneOff size={18} color="#fff" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document === "undefined" ? stage : createPortal(stage, document.body);
}
