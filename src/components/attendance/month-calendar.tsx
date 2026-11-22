import type { AttendanceStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const DOT: Record<AttendanceStatus, string> = {
  present: "bg-success text-success-foreground",
  absent: "bg-destructive text-white",
  excused: "bg-warning text-warning-foreground",
};

/**
 * Calendar for one month. Days with a class are coloured by status; days with
 * more than one class show the "worst" status (absent > leave > present).
 */
export function MonthCalendar({ month, days }: { month: string; days: Map<string, AttendanceStatus[]> }) {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const first = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7; // Monday first
  const title = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(first);

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="mb-3 text-sm font-medium">{title}</div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={i} className="pb-1">{d}</div>
        ))}
        {Array.from({ length: lead }, (_, i) => <div key={`l${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, "0")}`;
          const s = days.get(date);
          const status = s?.includes("absent") ? "absent" : s?.includes("excused") ? "excused" : s?.length ? "present" : null;
          return (
            <div
              key={date}
              className={cn(
                "tabular mx-auto flex size-8 items-center justify-center rounded-full text-xs",
                status ? cn(DOT[status], "font-semibold") : "text-foreground/70",
              )}
              title={s ? `${s.length} class${s.length > 1 ? "es" : ""}: ${s.join(", ")}` : undefined}
            >
              {i + 1}
            </div>
          );
        })}
      </div>
    </div>
  );
}
