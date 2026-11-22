import type { ClassRow } from "@/lib/types";
import { TIMEZONE } from "@/config/institute";

export function className(c: Pick<ClassRow, "department" | "batch" | "section">) {
  return `BS ${c.department.name} · ${c.batch.name}${c.section ? ` · Sec ${c.section}` : ""}`;
}

export function shortClassName(c: Pick<ClassRow, "department" | "batch" | "section">) {
  return `${c.department.code} · ${c.batch.name}${c.section ? ` ${c.section}` : ""}`;
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, day: "numeric", month: "short", year: "numeric" });
const dayFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, weekday: "short", day: "numeric", month: "short" });
const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, hour: "numeric", minute: "2-digit", hour12: true });

/** Dates stored as `YYYY-MM-DD` are calendar dates; parse at noon UTC to avoid TZ drift. */
const asDate = (d: string | Date) => (typeof d === "string" && d.length === 10 ? new Date(`${d}T12:00:00Z`) : new Date(d));

export const fmtDate = (d: string | Date) => dateFmt.format(asDate(d));
export const fmtDay = (d: string | Date) => dayFmt.format(asDate(d));
export const fmtTime = (d: string | Date) => timeFmt.format(new Date(d));

/** Today's date in Pakistan as YYYY-MM-DD. */
export function todayPK() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date());
}

export function pct(n: number | null | undefined) {
  return n == null ? "—" : `${Math.round(Number(n))}%`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** "MUHAMMAD AIMAL khan" → "Muhammad Aimal Khan" */
export function titleCase(s: string) {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|[\s\-.'(])([a-z])/g, (_, p, c: string) => p + c.toUpperCase());
}
