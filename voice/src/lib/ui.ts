import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fetcher = (url: string) => fetch(url).then((r) => r.json());

export async function action(url: string, body: unknown) {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}

/** "just now" / "8m ago" / "3h ago" / "2d ago" — for activity feeds and pipeline rows. */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const mins = (Date.now() - new Date(iso).getTime()) / 60_000;
  if (mins < 1.5) return "just now";
  if (mins < 60) return `${Math.round(mins)}m ago`;
  const hrs = mins / 60;
  if (hrs < 48) return `${Math.round(hrs)}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

/** True for events fresh enough to badge as new (last 15 min — i.e. done during this demo run). */
export function isRecent(iso: string | null | undefined): boolean {
  return !!iso && Date.now() - new Date(iso).getTime() < 15 * 60_000;
}
