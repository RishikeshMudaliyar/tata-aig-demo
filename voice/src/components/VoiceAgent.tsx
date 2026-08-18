"use client";

/**
 * Live NuPlay voice agents, rendered as a face-to-face call.
 *
 * The call is placed from the BROWSER, straight to agentx-prod. That is deliberate, and it
 * is the only path that works from this host:
 *   - The drop-in widget script points at the `api-in` gateway, whose CORS preflight comes
 *     back with no `access-control-allow-origin` — the browser kills it before it is sent.
 *   - Proxying through our own server fails too: agentx-prod is network-gated and Vercel's
 *     egress is not allowlisted (verified — ConnectTimeoutError to 3.7.142.174:443).
 *   - agentx-prod DOES CORS-allow this origin explicitly, including the exact headers we
 *     need, so calling it from the page works.
 *
 * Consequence: the gateway key ships in the client bundle. It is account-shared, and the
 * platform offers no server-side path from this host, so it cannot be kept private here.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Room, RoomEvent, Track, type RemoteTrack } from "livekit-client";
import { Bot, GraduationCap, Mic, MicOff, PhoneOff, Loader2, X } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { lookFor, firstName, type Gender } from "@/lib/faces";
import { DelegationCall } from "@/components/DelegationCall";

export type AgentKind = "COACH" | "QUALIFIER";

const API_BASE = "https://agentx-prod.nurixlabs.tech";

const AGENT_IDS: Record<AgentKind, string> = {
  COACH: "09183445-7988-496f-b28a-d4e8e426a3d9",
  QUALIFIER: "f00a63fc-5e5d-43ff-bb1e-bd0b40ee6268",
};

type Phase = "idle" | "starting" | "connecting" | "live" | "ended" | "error";

/** Attach an analyser to a MediaStreamTrack and keep `out` fed with a 0..1 loudness. */
function meter(track: MediaStreamTrack, out: React.MutableRefObject<number>) {
  const Ctx: typeof AudioContext =
    window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const src = ctx.createMediaStreamSource(new MediaStream([track]));
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  src.connect(analyser); // deliberately not connected to destination — playback is the <audio> element
  const buf = new Uint8Array(analyser.fftSize);
  let raf = 0;
  const tick = () => {
    analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / buf.length);
    out.current = Math.min(1, rms * 6); // speech rarely exceeds ~0.17 RMS
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(raf);
    void ctx.close().catch(() => {});
  };
}

export function CallStage({
  kind,
  personName,
  personRole,
  gender,
  contextNote,
  variables,
  compact = false,
  onClose,
}: {
  kind: AgentKind;
  personName: string;
  personRole: string;
  gender?: Gender;
  contextNote?: string;
  variables?: Record<string, string>;
  /** Phone-sized layout: smaller figure, thumb-reachable controls. */
  compact?: boolean;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState<string>("");
  const [micBlocked, setMicBlocked] = useState(false);
  const [muted, setMuted] = useState(false);
  const [listening, setListening] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const roomRef = useRef<Room | null>(null);
  const agentLevel = useRef(0);
  const micLevel = useRef(0);
  const cleanups = useRef<(() => void)[]>([]);

  const look = lookFor(personName, gender);

  const teardown = useCallback(async () => {
    cleanups.current.forEach((f) => f());
    cleanups.current = [];
    await roomRef.current?.disconnect().catch(() => {});
    roomRef.current = null;
    agentLevel.current = 0;
    micLevel.current = 0;
  }, []);

  const hangUp = useCallback(async () => {
    await teardown();
    setPhase("ended");
  }, [teardown]);

  // Who is talking — drives the avatar's listening pose.
  useEffect(() => {
    if (phase !== "live") return;
    const id = setInterval(() => {
      setListening(micLevel.current > 0.06 && agentLevel.current < 0.05);
    }, 120);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "live") return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const start = useCallback(async () => {
    setError(null);
    setCaption("");
    setSeconds(0);
    setPhase("starting");
    try {
      const gatewayKey = process.env.NEXT_PUBLIC_NURIX_GATEWAY_API_KEY ?? "";
      if (!gatewayKey) {
        setPhase("error");
        setError("Voice is not configured on this deployment.");
        return;
      }

      const res = await fetch(`${API_BASE}/voice/web/call`, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "user-id": crypto.randomUUID(),
          "x-api-key": gatewayKey,
        },
        body: JSON.stringify({
          agent_id: AGENT_IDS[kind],
          overide_previous_context: true, // sic — the real field name in the platform API
          custom_dynamic_variables_config: variables ?? {},
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setPhase("error");
        setError(
          res.status === 403
            ? "The voice gateway rejected the key (403)."
            : `The voice gateway returned ${res.status}.`,
        );
        return;
      }

      setPhase("connecting");
      const { serverUrl, participantToken } = data as { serverUrl?: string; participantToken?: string };
      if (!serverUrl || !participantToken) {
        setPhase("error");
        setError("The call was accepted but queued — no room was returned.");
        return;
      }

      const room = new Room({ adaptiveStream: true });
      roomRef.current = room;

      room.on(RoomEvent.Disconnected, () => setPhase("ended"));
      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind !== Track.Kind.Audio) return;
        const el = track.attach();
        el.autoplay = true;
        document.body.appendChild(el);
        cleanups.current.push(() => {
          track.detach().forEach((e) => e.remove());
        });
        if (track.mediaStreamTrack) cleanups.current.push(meter(track.mediaStreamTrack, agentLevel));
      });
      room.on(RoomEvent.TranscriptionReceived, (segments) => {
        // Strip inline control tags (e.g. the derived-variable counter) — voiceX removes
        // them before TTS, but they arrive in transcription and must never be shown.
        const finals = segments
          .filter((s) => s.final)
          .map((s) => s.text.replace(/<[^>]*>/g, "").trim())
          .filter(Boolean);
        if (finals.length) setCaption(finals[finals.length - 1]);
      });

      await room.connect(serverUrl, participantToken);
      // Joining the room and capturing the mic are separate permissions — never let a
      // blocked mic leave the user stuck on "connecting".
      setPhase("live");
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
        const mine = room.localParticipant
          .getTrackPublications()
          .find((p) => p.source === Track.Source.Microphone)?.track?.mediaStreamTrack;
        if (mine) cleanups.current.push(meter(mine, micLevel));
      } catch {
        setMicBlocked(true);
      }
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [kind, variables]);

  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !muted;
    setMuted(next);
    await room.localParticipant.setMicrophoneEnabled(!next).catch(() => {});
  }, [muted]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") void teardown().then(onClose);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose, teardown]);

  useEffect(() => () => void teardown(), [teardown]);

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  const status =
    phase === "starting" ? "Connecting…"
    : phase === "connecting" ? "Joining the call…"
    : phase === "live" ? (micBlocked ? "Microphone blocked" : listening ? `Listening to you` : `${firstName(personName)} is on the call`)
    : phase === "ended" ? "Call ended"
    : phase === "error" ? "Could not connect"
    : "Ready when you are";

  const stage = (
    <div className="fixed inset-0 z-[200] flex flex-col call-stage">
      {/* header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: "rgba(255,255,255,0.12)" }}>
            {kind === "COACH" ? <GraduationCap size={17} color="#fff" /> : <Bot size={17} color="#fff" />}
          </span>
          <div>
            <div className="text-[15px] text-white">{personName}</div>
            <div className="text-[12px]" style={{ color: "rgba(255,255,255,0.6)" }}>{personRole}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {phase === "live" && (
            <span className="tnum text-[13px]" style={{ color: "rgba(255,255,255,0.7)" }}>{mmss}</span>
          )}
          <button onClick={() => void teardown().then(onClose)} aria-label="Close" className="p-1">
            <X size={20} color="rgba(255,255,255,0.75)" />
          </button>
        </div>
      </div>

      {/* stage */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 min-h-0">
        <Avatar look={look} levelRef={agentLevel} listening={listening && phase === "live"} size={compact ? 236 : 380} />

        <div className="mt-5 flex items-center gap-2">
          {phase === "live" && !micBlocked && (
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: listening ? "#7fd1a0" : "#8ab6e8" }}
            />
          )}
          {(phase === "starting" || phase === "connecting") && <Loader2 size={14} color="rgba(255,255,255,0.7)" className="animate-spin" />}
          <span className="text-[14px]" style={{ color: "rgba(255,255,255,0.82)" }}>{status}</span>
        </div>

        {/* caption */}
        <div className="mt-3 sm:mt-4 min-h-[48px] max-w-xl text-center">
          {phase === "live" && caption && (
            <p className="text-[16px] leading-snug fade-in" style={{ color: "#fff" }}>{caption}</p>
          )}
          {phase === "idle" && contextNote && (
            <p className="text-[14px] leading-snug" style={{ color: "rgba(255,255,255,0.62)" }}>{contextNote}</p>
          )}
          {phase === "error" && (
            <p className="text-[14px] leading-snug" style={{ color: "#ffb4ab" }}>{error}</p>
          )}
        </div>
      </div>

      {/* controls */}
      <div className="flex items-center justify-center gap-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-2">
        {(phase === "idle" || phase === "ended" || phase === "error") && (
          <button className="btn btn-primary" onClick={() => void start()}>
            <Mic size={16} /> {phase === "idle" ? "Start the call" : "Call again"}
          </button>
        )}
        {phase === "live" && (
          <>
            <button
              className="grid h-14 w-14 sm:h-12 sm:w-12 place-items-center rounded-full"
              style={{ background: muted ? "#fff" : "rgba(255,255,255,0.14)" }}
              onClick={() => void toggleMute()}
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? <MicOff size={18} color="#0a2e52" /> : <Mic size={18} color="#fff" />}
            </button>
            <button
              className="grid h-14 w-14 sm:h-12 sm:w-12 place-items-center rounded-full"
              style={{ background: "#d32f2f" }}
              onClick={() => void hangUp()}
              aria-label="End call"
            >
              <PhoneOff size={18} color="#fff" />
            </button>
          </>
        )}
      </div>
    </div>
  );

  return typeof document === "undefined" ? stage : createPortal(stage, document.body);
}

export function VoiceAgentButton({
  kind,
  label,
  personName,
  personRole,
  gender,
  contextNote,
  variables,
  leadPhone,
  salespersonName,
  compact = false,
  className,
  style,
}: {
  kind: AgentKind;
  label: string;
  personName: string;
  personRole: string;
  gender?: Gender;
  contextNote?: string;
  variables?: Record<string, string>;
  leadPhone?: string;
  salespersonName?: string;
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const Icon = kind === "COACH" ? GraduationCap : Bot;
  return (
    <>
      <button className={className} style={style} onClick={() => setOpen(true)}>
        <Icon size={15} /> {label}
      </button>
      {open && kind === "QUALIFIER" && (
        <DelegationCall
          leadName={personName}
          leadPhone={leadPhone ?? ""}
          salespersonName={salespersonName ?? "your salesperson"}
          contextNote={contextNote}
          variables={variables}
          onClose={() => setOpen(false)}
        />
      )}
      {open && kind === "COACH" && (
        <CallStage
          kind={kind}
          personName={personName}
          personRole={personRole}
          gender={gender}
          contextNote={contextNote}
          variables={variables}
          compact={compact}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
