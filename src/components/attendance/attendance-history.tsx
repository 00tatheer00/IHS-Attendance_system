import { CalendarXIcon } from "lucide-react";
import { StatusBadge } from "./status-badge";
import { fmtDay, fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { HistoryItem } from "@/lib/student-attendance";

const monthFmt = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

/** Attendance list grouped by month. Shared by the teacher dashboard and the student portal. */
export function AttendanceHistory({
  items,
  subjectCode,
  className,
  emptyText = "No classes recorded yet.",
}: {
  items: HistoryItem[];
  subjectCode?: (offeringId: string) => string | undefined;
  className?: string;
  emptyText?: string;
}) {
  if (!items.length) {
    return (
      <div className={cn("flex flex-col items-center rounded-xl border border-dashed bg-card py-10 text-center text-sm text-muted-foreground", className)}>
        <CalendarXIcon className="mb-2 size-5" />
        {emptyText}
      </div>
    );
  }
  const groups = Object.groupBy(items, (i) => i.session.session_date.slice(0, 7));
  return (
    <div className={cn("space-y-5", className)}>
      {Object.entries(groups).map(([month, list]) => {
        const present = list!.filter((i) => i.status === "present").length;
        return (
          <section key={month}>
            <div className="mb-2 flex items-baseline justify-between px-1">
              <h3 className="text-sm font-medium">{monthFmt.format(new Date(`${month}-01T00:00:00Z`))}</h3>
              <span className="tabular text-xs text-muted-foreground">
                {present}/{list!.length} present
              </span>
            </div>
            <ul className="divide-y overflow-hidden surface rounded-2xl">
              {list!.map((i) => (
                <li key={i.id} className="flex items-center gap-3 px-4 py-3">
                  <div
                    className={cn(
                      "h-9 w-1 shrink-0 rounded-full",
                      i.status === "present" ? "bg-success" : i.status === "absent" ? "bg-destructive" : "bg-warning",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{fmtDay(i.session.session_date)}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {[subjectCode?.(i.session.offering_id), i.session.topic, i.status === "present" ? `marked ${fmtTime(i.marked_at)}` : null, i.note]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  <StatusBadge status={i.status} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
