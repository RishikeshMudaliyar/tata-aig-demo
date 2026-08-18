"use client";

/**
 * One implementation of "place a NuPlay web call and join the room", shared by both
 * call surfaces — the Smart Coach face-to-face stage and the delegation two-phone stage.
 *
 * The call is placed from the BROWSER, straight to agentx-prod:
 *   - the drop-in widget's gateway fails CORS preflight (no access-control-allow-origin)
 *   - our own server cannot reach agentx-prod at all (network-gated; Vercel egress times out)
 *   - agentx-prod explicitly CORS-allows this origin, so the page can call it directly
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track, type RemoteTrack, type Participant } from "livekit-client";

export type AgentKind = "COACH" | "QUALIFIER";
export type Phase = "idle" | "dialling" | "connecting" | "live" | "ended" | "error";
export type Line = { id: string; who: "agent" | "you"; text: string };

const API_BASE = "https://agentx-prod.nurixlabs.tech";

export const AGENT_IDS: Record<AgentKind, string> = {
  COACH: process.env.NEXT_PUBLIC_NURIX_COACH_AGENT_ID ?? "a6874aeb-8061-43e7-bb0b-7515dbfa115a",
  QUALIFIER: process.env.NEXT_PUBLIC_NURIX_QUALIFIER_AGENT_ID ?? "fbad08b6-4f3f-48ec-ac6b-056c6ba536fe",
};

/** Feed `out` with a 0..1 loudness for a track, so callers can drive animation. */
function meter(track: MediaStreamTrack, out: React.MutableRefObject<number>) {
  const Ctx: typeof AudioContext =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const src = ctx.createMediaStreamSource(new MediaStream([track]));
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  src.connect(analyser); // not connected to destination — the <audio> element does playback
  const buf = new Uint8Array(analyser.fftSize);
  let raf = 0;
  const tick = () => {
    analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128;
      sum += v * v;
    }
    out.current = Math.min(1, Math.sqrt(sum / buf.length) * 6);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(raf);
    void ctx.close().catch(() => {});
  };
}

export function useVoiceCall(kind: AgentKind, variables?: Record<string, string>) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [micBlocked, setMicBlocked] = useState(false);
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const roomRef = useRef<Room | null>(null);
  const agentLevel = useRef(0);
  const micLevel = useRef(0);
  const cleanups = useRef<(() => void)[]>([]);

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

  useEffect(() => {
    if (phase !== "live") return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => () => void teardown(), [teardown]);

  const start = useCallback(async () => {
    setError(null);
    setLines([]);
    setSeconds(0);
    setPhase("dialling");
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
      const data = (await res.json().catch(() => ({}))) as {
        serverUrl?: string;
        participantToken?: string;
      };

      if (!res.ok) {
        setPhase("error");
        setError(
          res.status === 403
            ? "The voice gateway rejected the key (403)."
            : `The voice gateway returned ${res.status}.`,
        );
        return;
      }
      if (!data.serverUrl || !data.participantToken) {
        setPhase("error");
        setError("The call was accepted but queued — no room was returned.");
        return;
      }

      setPhase("connecting");
      const room = new Room({ adaptiveStream: true });
      roomRef.current = room;

      room.on(RoomEvent.Disconnected, () => setPhase("ended"));

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind !== Track.Kind.Audio) return;
        const el = track.attach();
        el.autoplay = true;
        document.body.appendChild(el);
        cleanups.current.push(() => track.detach().forEach((e) => e.remove()));
        if (track.mediaStreamTrack) cleanups.current.push(meter(track.mediaStreamTrack, agentLevel));
      });

      // Attribute each line to a speaker so a split transcript can put it on the right side.
      room.on(RoomEvent.TranscriptionReceived, (segments, participant?: Participant) => {
        const isYou = !!participant && participant.sid === room.localParticipant.sid;
        const finals = segments
          // The agent emits control tags inline with speech (e.g. the derived-variable
          // counter). voiceX strips them before TTS, but they DO reach transcription —
          // never let them render as caption text.
          .map((s) => ({ ...s, text: s.text.replace(/<[^>]*>/g, "").trim() }))
          .filter((s) => s.final && s.text);
        if (!finals.length) return;
        setLines((prev) => [
          ...prev,
          ...finals.map((s) => ({ id: s.id, who: isYou ? ("you" as const) : ("agent" as const), text: s.text })),
        ]);
      });

      await room.connect(data.serverUrl, data.participantToken);
      setPhase("live");
      // Joining the room and capturing the mic are separate permissions — a blocked mic
      // must not leave the caller stuck on "connecting".
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

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return {
    phase, error, lines, micBlocked, muted, seconds, mmss,
    agentLevel, micLevel,
    start, hangUp, toggleMute, teardown,
  };
}
