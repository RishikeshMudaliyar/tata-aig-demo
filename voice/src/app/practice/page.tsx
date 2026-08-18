"use client";

/**
 * Sales Coach as a destination of its own.
 *
 * Practising is a habit, not something you only think of while already inside one lead —
 * so it gets a nav entry, and the first thing it asks is who you want to practise against.
 * Built mobile-first: a rep rehearses on a phone in a car park before walking in.
 */
import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/ui";
import { Shell } from "@/components/Shell";
import { usePersona } from "@/components/PersonaProvider";
import { CallStage } from "@/components/VoiceAgent";
import { useIsMobile } from "@/lib/useIsMobile";
import { guessGender } from "@/lib/faces";
import { Search, GraduationCap, ChevronRight } from "lucide-react";

type Lead = {
  id: string;
  name: string;
  city?: string | null;
  source: string;
  productInterest: string;
  occupation?: string | null;
  score: number;
  status: string;
};

export default function PracticePage() {
  const { persona } = usePersona();
  const isMobile = useIsMobile();
  const { data } = useSWR<{ leads: Lead[] }>("/api/leads", fetcher);
  const [q, setQ] = useState("");
  const [chosen, setChosen] = useState<Lead | null>(null);

  const leads = useMemo(() => {
    const all = (data?.leads ?? []).filter((l) => l.status !== "CLOSED");
    const t = q.trim().toLowerCase();
    return t
      ? all.filter((l) =>
          [l.name, l.city, l.source, l.productInterest].join(" ").toLowerCase().includes(t),
        )
      : all;
  }, [data, q]);

  return (
    <Shell>
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <GraduationCap size={20} style={{ color: "var(--brand)" }} />
          <h1 className="display-md" style={{ color: "var(--navy)" }}>Practice a pitch</h1>
        </div>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Pick who you want to rehearse against. They will push back like the real customer does,
          then score you out of ten.
        </p>
      </div>

      <div className="relative mb-4" style={{ maxWidth: 420 }}>
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-mute)" }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a lead"
          className="w-full rounded-lg pl-9 pr-3 py-2.5 text-[15px]"
          style={{ border: "1px solid var(--hairline)", background: "var(--canvas)" }}
        />
      </div>

      {!data && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card p-4" style={{ height: 108, opacity: 0.5 }} />
          ))}
        </div>
      )}

      {data && leads.length === 0 && (
        <div className="card p-6 text-center text-sm" style={{ color: "var(--muted)" }}>
          No leads match “{q}”.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {leads.map((l) => (
          <button
            key={l.id}
            onClick={() => setChosen(l)}
            className="card p-4 text-left transition active:scale-[0.99]"
            style={{ minHeight: 108 }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-[15px] truncate">{l.name}</div>
                <div className="text-[12.5px] truncate" style={{ color: "var(--ink-mute)" }}>
                  {[l.occupation, l.city].filter(Boolean).join(" · ")}
                </div>
              </div>
              <span className="chip tnum shrink-0">score {l.score}</span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-[12.5px] truncate" style={{ color: "var(--ink-secondary)" }}>
                {l.source} · {l.productInterest}
              </span>
              <span className="inline-flex items-center gap-1 text-[13px] shrink-0" style={{ color: "var(--brand)" }}>
                Practise <ChevronRight size={14} />
              </span>
            </div>
          </button>
        ))}
      </div>

      {chosen && (
        <CallStage
          kind="COACH"
          personName={chosen.name}
          personRole={[chosen.occupation, chosen.city].filter(Boolean).join(" · ") || "Prospective customer"}
          gender={guessGender(chosen.name)}
          compact={isMobile}
          contextNote={`Rehearse the ${chosen.productInterest?.toLowerCase()} pitch for ${chosen.name.split(" ")[0]}. Expect pushback on price, existing cover and “let me ask my spouse”.`}
          variables={{
            lead_name: chosen.name,
            product_interest: chosen.productInterest ?? "",
            city: chosen.city ?? "",
            salesperson_name: persona?.name ?? "",
          }}
          onClose={() => setChosen(null)}
        />
      )}
    </Shell>
  );
}
