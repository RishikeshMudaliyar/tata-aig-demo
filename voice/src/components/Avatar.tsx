"use client";

/**
 * The person you are talking to.
 *
 * The jaw is driven by the real amplitude of the agent's audio track, not a canned loop —
 * that is what makes it read as "she is saying this" rather than "an animation is playing".
 * Level arrives through a ref and is applied straight to the DOM inside a rAF loop, so a
 * 60fps signal never re-renders React.
 */
import { useEffect, useRef } from "react";
import type { Look } from "@/lib/faces";

export function Avatar({
  look,
  levelRef,
  listening,
  size = 380,
}: {
  look: Look;
  levelRef: React.MutableRefObject<number>;
  listening: boolean;
  size?: number;
}) {
  const cavity = useRef<SVGEllipseElement>(null);
  const lowerLip = useRef<SVGGElement>(null);
  const jaw = useRef<SVGGElement>(null);
  useEffect(() => {
    let raf = 0;
    let smoothed = 0;
    const tick = () => {
      const target = Math.min(1, Math.max(0, levelRef.current));
      smoothed += (target - smoothed) * 0.35; // ease so the mouth doesn't judder per sample
      const open = smoothed * smoothed; // closer to how a jaw actually moves

      cavity.current?.setAttribute("ry", String(open * 11));
      lowerLip.current?.setAttribute("transform", `translate(0 ${open * 11})`);
      jaw.current?.setAttribute("transform", `translate(0 ${open * 3})`);

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [levelRef]);

  const { skin, hair, outfit, outfitDark, gender, hairVariant } = look;

  return (
    <div className="relative" style={{ width: size, height: size * 1.08 }} aria-hidden="true">
      {/* soft stage light behind the person */}
      <span
        className="absolute rounded-full"
        style={{
          inset: "4% 6% 12% 6%",
          background: "radial-gradient(circle at 50% 42%, rgba(255,255,255,0.13), transparent 68%)",
        }}
      />
      {listening && (
        <span
          className="absolute rounded-full listening-ring"
          style={{ inset: "3% 5% 10% 5%", border: "2px solid rgba(127,209,160,0.5)" }}
        />
      )}

      <svg viewBox="0 0 320 350" width="100%" height="100%" className="avatar-sway">
        <defs>
          <radialGradient id="av-cheek" cx="50%" cy="50%">
            <stop offset="0%" stopColor="rgba(198,88,88,0.22)" />
            <stop offset="100%" stopColor="rgba(198,88,88,0)" />
          </radialGradient>
          <linearGradient id="av-hair" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.16)" />
            <stop offset="55%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        {/* hair behind the head */}
        {gender === "female" ? (
          <path
            d={
              hairVariant === 0
                ? "M160 40c-54 0-87 39-87 95 0 46 6 81 10 122 3 27 19 35 31 31-14-41-16-99-10-132 27 10 85 10 112 0 6 33 4 91-10 132 12 4 28-4 31-31 4-41 10-76 10-122 0-56-33-95-87-95z"
                : "M160 40c-52 0-85 37-85 93 0 41 4 72 6 107 2 23 15 31 25 27-10-35-12-87-8-118 27 12 87 12 114 0 4 31 2 83-8 118 10 4 23-4 25-27 2-35 6-66 6-107 0-56-33-93-85-93z"
            }
            fill={hair}
          />
        ) : (
          <path d="M160 46c-45 0-74 29-76 70-1 15 2 25 4 31 4-31 21-47 45-53 21-5 33-5 54 0 24 6 41 22 45 53 2-6 5-16 4-31-2-41-31-70-76-70z" fill={hair} />
        )}

        {/* shoulders */}
        <path d="M52 350c0-60 36-94 108-94s108 34 108 94z" fill={outfit} />
        <path d="M52 350c0-60 36-94 108-94v94z" fill="rgba(0,0,0,0.07)" />
        <path d="M130 258h60l-9 92h-42z" fill={outfitDark} />
        {gender === "male" && <path d="M146 258h28l-7 28-7 11-7-11z" fill="#f2f5f8" />}

        {/* neck */}
        <path d="M136 214h48v36c0 13-48 13-48 0z" fill={skin} />
        <path d="M136 228c15 11 33 11 48 0v-14h-48z" fill="rgba(0,0,0,0.10)" />

        {/* head */}
        <ellipse cx="160" cy="146" rx="66" ry="80" fill={skin} />
        <ellipse cx="94" cy="156" rx="9" ry="14" fill={skin} />
        <ellipse cx="226" cy="156" rx="9" ry="14" fill={skin} />

        {/* fringe */}
        {gender === "female" ? (
          <>
            <path d="M160 68c-40 0-63 26-65 60 15-18 36-27 65-27s50 9 65 27c-2-34-25-60-65-60z" fill={hair} />
            <path d="M160 68c-40 0-63 26-65 60 15-18 36-27 65-27s50 9 65 27c-2-34-25-60-65-60z" fill="url(#av-hair)" />
          </>
        ) : (
          <>
            <path d="M160 72c-36 0-59 21-61 49 13-19 34-28 61-28s48 9 61 28c-2-28-25-49-61-49z" fill={hair} />
            <path d="M160 72c-36 0-59 21-61 49 13-19 34-28 61-28s48 9 61 28c-2-28-25-49-61-49z" fill="url(#av-hair)" />
          </>
        )}

        {/* brows */}
        <path d="M124 124c9-7 24-7 33-1" stroke={hair} strokeWidth="5.5" strokeLinecap="round" fill="none" />
        <path d="M163 123c9-6 24-6 33 1" stroke={hair} strokeWidth="5.5" strokeLinecap="round" fill="none" />

        {/* eyes */}
        <g>
          <ellipse cx="133" cy="147" rx="15" ry="9" fill="#fbfbfa" />
          <ellipse cx="187" cy="147" rx="15" ry="9" fill="#fbfbfa" />
          <circle cx="134" cy="147" r="6.6" fill="#4a3222" />
          <circle cx="188" cy="147" r="6.6" fill="#4a3222" />
          <circle cx="134" cy="147" r="3" fill="#1b1109" />
          <circle cx="188" cy="147" r="3" fill="#1b1109" />
          <circle cx="137" cy="144" r="2.1" fill="#fff" opacity="0.95" />
          <circle cx="191" cy="144" r="2.1" fill="#fff" opacity="0.95" />
          {/* Lid line hugs the TOP EDGE of the eye. An arc floating above it reads as a
              closed eyelid at presentation scale, which is the opposite of what we want. */}
          <path d="M118 147a15 9 0 0 1 30 0" stroke={hair} strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M172 147a15 9 0 0 1 30 0" stroke={hair} strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <ellipse className="eyelid" cx="133" cy="147" rx="15.4" ry="9.4" fill={skin} />
          <ellipse className="eyelid" cx="187" cy="147" rx="15.4" ry="9.4" fill={skin} />
        </g>

        <ellipse cx="112" cy="176" rx="20" ry="13" fill="url(#av-cheek)" />
        <ellipse cx="208" cy="176" rx="20" ry="13" fill="url(#av-cheek)" />

        {/* nose + mouth ride the jaw */}
        <g ref={jaw}>
          <path d="M160 152c-6 14-9 19-2 22 4 2 6 2 9 0" stroke="rgba(0,0,0,0.13)" strokeWidth="3.6" fill="none" strokeLinecap="round" />

          {/* cavity sits behind the lips and grows as the jaw drops */}
          <ellipse ref={cavity} cx="160" cy="199" rx="16" ry="0" fill="#4d1620" />
          {/* upper lip stays put */}
          <path d="M142 197q9-8 18-3 9-5 18 3-18 6-36 0z" fill={gender === "female" ? "#a4515c" : "#8d5a52"} />
          {/* lower lip drops with the jaw */}
          <g ref={lowerLip}>
            <path d="M142 198q18 12 36 0-18 7-36 0z" fill={gender === "female" ? "#8f3f4a" : "#7a4841"} />
          </g>
        </g>
      </svg>
    </div>
  );
}
