"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { usePersona } from "@/components/PersonaProvider";
import { ROLE_LABEL, type Role } from "@/lib/domain";
import { fetcher, action } from "@/lib/ui";
import { LayoutGrid, ShieldCheck, HeartPulse, GitBranch, LogOut, Bell, TowerControl, Target, GraduationCap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";

const ALL_NAV = [
  { href: "/cockpit", label: "My Day", icon: LayoutGrid },
  { href: "/pipeline", label: "My Book", icon: GitBranch },
  { href: "/practice", label: "Practice", icon: GraduationCap },
  { href: "/underwriting", label: "Work Queue", icon: ShieldCheck },
  { href: "/lapse", label: "Retention", icon: HeartPulse },
  { href: "/performance", label: "Performance", icon: Target },
  { href: "/admin", label: "Control Tower", icon: TowerControl },
];

// Nav is scoped to the job. Sales sees their own book's status; analyst/UW see
// their tagged cases in the Work Queue; leadership gets the abstracted pipeline.
const NAV_BY_ROLE: Record<string, string[]> = {
  FLS: ["/cockpit", "/pipeline", "/practice", "/lapse", "/performance"],
  ADVISOR: ["/cockpit", "/pipeline", "/practice", "/lapse", "/performance"],
  ANALYST: ["/cockpit", "/underwriting"],
  UNDERWRITER: ["/cockpit", "/underwriting"],
  OPS: ["/cockpit", "/lapse"],
  LEADERSHIP: ["/pipeline", "/performance"],
  ADMIN: ["/admin", "/pipeline", "/performance"],
};

const NAV_LABEL_BY_ROLE: Record<string, Record<string, string>> = {
  FLS: { "/performance": "My KPIs" },
  ADVISOR: { "/performance": "My KPIs" },
  LEADERSHIP: { "/pipeline": "Pipeline" },
  ADMIN: { "/pipeline": "Pipeline" },
};

const HOME_BY_ROLE: Record<string, string> = { ADMIN: "/admin", LEADERSHIP: "/pipeline" };

function NotificationsBell({ personaId }: { personaId: string }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<any | null>(null);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const lastSeenId = useRef<string | null>(null);
  const primed = useRef(false);
  const { data, mutate } = useSWR<{ items: any[]; unread: number }>(`/api/notifications?personaId=${personaId}`, fetcher, { refreshInterval: 3000 });

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // toast the moment a NEW notification lands (first fetch only primes the baseline)
  useEffect(() => {
    if (!data) return;
    const newest = data.items?.[0];
    if (!primed.current) { primed.current = true; lastSeenId.current = newest?.id ?? null; return; }
    if (newest && !newest.readAt && newest.id !== lastSeenId.current) {
      lastSeenId.current = newest.id;
      setToast(newest);
    }
  }, [data]);

  // auto-hide lives on the toast itself, so later polls can't cancel it early
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 8000);
    return () => clearTimeout(t);
  }, [toast]);

  const unread = data?.unread ?? 0;

  const openItem = async (n: any) => {
    await action("/api/notifications", { id: n.id });
    await mutate();
    setOpen(false);
    if (n.href) router.push(n.href);
  };

  return (
    <div className="relative" ref={ref}>
      <button className="btn btn-sm btn-ghost relative" style={{ color: "rgba(255,255,255,0.9)" }} onClick={() => setOpen((v) => !v)} title="Notifications">
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid place-items-center rounded-full text-[9px] tnum" style={{ minWidth: 15, height: 15, padding: "0 3px", background: "var(--primary)", color: "#fff", fontWeight: 500 }}>{unread}</span>
        )}
      </button>
      {toast && (
        <button
          onClick={() => { setToast(null); openItem(toast); }}
          className="fixed right-4 top-16 z-50 card card-float p-3 flex items-start gap-2.5 text-left slide-in"
          style={{ width: 320, borderLeft: "3px solid var(--primary)" }}>
          <Bell size={15} style={{ color: "var(--primary)", marginTop: 2 }} className="shrink-0" />
          <span className="text-[13px] leading-snug" style={{ color: "var(--ink)" }}>{toast.text}</span>
        </button>
      )}
      {open && (
        <div className="absolute right-0 mt-2 w-80 card card-float p-2 z-50 fade-in">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="micro-cap" style={{ color: "var(--muted)" }}>Notifications</span>
            {unread > 0 && (
              <button className="text-[11px]" style={{ color: "var(--brand)" }} onClick={async () => { await action("/api/notifications", { personaId }); await mutate(); }}>Mark all read</button>
            )}
          </div>
          <div className="grid max-h-80 overflow-y-auto scrollbar-thin">
            {(data?.items ?? []).length === 0 && <div className="text-sm p-3" style={{ color: "var(--muted)" }}>Nothing yet.</div>}
            {data?.items.map((n) => (
              <button key={n.id} onClick={() => openItem(n)} className="text-left text-[13px] px-2.5 py-2 rounded-lg transition hover:bg-black/[0.03] flex items-start gap-2">
                <span className="mt-1.5 shrink-0 rounded-full" style={{ width: 7, height: 7, background: n.readAt ? "var(--hairline)" : "var(--primary)" }} />
                <span style={{ color: n.readAt ? "var(--muted)" : "var(--ink)" }}>{n.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { persona, setPersona, ready } = usePersona();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (ready && !persona) router.replace("/");
  }, [ready, persona, router]);

  if (!ready) return null;
  if (!persona) return null;

  const allowed = NAV_BY_ROLE[persona.role] ?? ["/cockpit"];
  const NAV = ALL_NAV.filter((n) => allowed.includes(n.href)).map((n) => ({
    ...n,
    label: NAV_LABEL_BY_ROLE[persona.role]?.[n.href] ?? n.label,
  }));

  return (
    <div className="flex flex-col min-h-dvh">
      <header className="sticky top-0 z-30" style={{ background: "var(--brand)" }}>
        <div className="max-w-[1480px] mx-auto px-6 h-14 flex items-center justify-between gap-3">
          <Link href={HOME_BY_ROLE[persona.role] ?? "/cockpit"} className="flex items-center gap-2.5 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bajaj-life-logo.gif" alt="Bajaj Life" style={{ height: 38, width: "auto" }} />
            <span className="hidden sm:block text-[14px] pl-2.5" style={{ color: "rgba(255,255,255,0.85)", fontWeight: 300, borderLeft: "1px solid rgba(255,255,255,0.3)" }}>
              Unified Sales Platform
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((n) => {
              const active = pathname.startsWith(n.href);
              return (
                <Link key={n.href} href={n.href}
                  className="px-3.5 py-1.5 rounded-full text-[13.5px] transition"
                  style={{ background: active ? "#fff" : "transparent", color: active ? "var(--brand)" : "rgba(255,255,255,0.9)", fontWeight: active ? 500 : 400 }}>
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 shrink-0">
            <NotificationsBell personaId={persona.id} />
            <div className="text-right leading-tight hidden sm:block ml-1">
              <div className="text-[13.5px]" style={{ color: "#fff", fontWeight: 500 }}>{persona.name}</div>
              <div className="text-[10.5px]" style={{ color: "rgba(255,255,255,0.7)" }}>{ROLE_LABEL[persona.role as Role] ?? persona.role}</div>
            </div>
            <div className="grid place-items-center rounded-full text-[12.5px]" style={{ width: 32, height: 32, background: "#fff", color: "var(--brand)", fontWeight: 600 }}>{persona.initials}</div>
            <button className="btn btn-sm btn-ghost" style={{ color: "rgba(255,255,255,0.8)" }} onClick={() => { setPersona(null); router.push("/"); }} title="Switch persona">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1480px] mx-auto px-6 py-6 pb-24 md:pb-10">{children}</main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t bg-white/95 backdrop-blur" style={{ borderColor: "var(--hairline)" }}>
        <div className="flex max-w-[1480px] mx-auto">
          {NAV.map((n) => {
            const active = pathname.startsWith(n.href);
            const Icon = n.icon;
            return (
              <Link key={n.href} href={n.href} className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10.5px]" style={{ color: active ? "var(--brand)" : "var(--ink-mute)", fontWeight: active ? 500 : 400 }}>
                <Icon size={20} strokeWidth={active ? 2 : 1.6} />
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
