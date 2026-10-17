import type { Timestamp } from "firebase/firestore";

const MONTHS = [
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
];

/** "2026-06-14" → "14 giugno 2026" */
export function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** "2026-06-14" → "14.06.2026" */
export function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d}.${m}.${y}`;
}

export function timeAgo(ts: Timestamp | null): string {
  if (!ts) return "adesso";
  const s = Math.max(0, (Date.now() - ts.toMillis()) / 1000);
  if (s < 60) return "adesso";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min fa`;
  const h = Math.floor(m / 60);
  if (h < 24) return h === 1 ? "1 ora fa" : `${h} ore fa`;
  const d = Math.floor(h / 24);
  return d === 1 ? "ieri" : `${d} giorni fa`;
}

export function duration(seconds: number | null): string {
  if (seconds == null) return "";
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter((p) => /^\p{L}/u.test(p))
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

const TONES = ["#EAD9D0", "#DDE1D3", "#E4DCCF", "#EFE3D6", "#D9DED6", "#E9DFD2"];

/** Stable soft background for avatars and placeholders. */
export function toneFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return TONES[Math.abs(h) % TONES.length];
}

export function eventTitle(e: { name1: string; name2: string }): string {
  return `${e.name1} & ${e.name2}`;
}

export function albumUrl(slug: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base.replace(/\/$/, "")}/${slug}`;
}

/** Display form of the album link, without protocol. */
export function prettyUrl(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

export function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}
