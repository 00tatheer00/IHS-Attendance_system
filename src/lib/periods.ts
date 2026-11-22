import { todayPK } from "@/lib/format";

export type Period = "week" | "month" | "all" | "custom";

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Resolves a named period to an inclusive [from, to] date range (Pakistan time). */
export function resolvePeriod(period: Period, from?: string, to?: string): { from: string | null; to: string | null } {
  const today = todayPK();
  const t = new Date(`${today}T12:00:00Z`);
  if (period === "week") {
    const day = (t.getUTCDay() + 6) % 7; // Monday = 0
    const start = new Date(t);
    start.setUTCDate(t.getUTCDate() - day);
    return { from: iso(start), to: today };
  }
  if (period === "month") return { from: `${today.slice(0, 7)}-01`, to: today };
  if (period === "custom") return { from: from || null, to: to || null };
  return { from: null, to: null };
}
