import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/lib/types";

const styles: Record<AttendanceStatus | "none", string> = {
  present: "bg-success/12 text-success ring-success/25",
  absent: "bg-destructive/10 text-destructive ring-destructive/20",
  excused: "bg-warning/20 text-warning-foreground ring-warning/40",
  none: "bg-muted text-muted-foreground ring-border",
};

const labels: Record<AttendanceStatus | "none", string> = {
  present: "Present",
  absent: "Absent",
  excused: "Leave",
  none: "Not marked",
};

export function StatusBadge({ status, className }: { status: AttendanceStatus | null; className?: string }) {
  const key = status ?? "none";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        styles[key],
        className,
      )}
    >
      {labels[key]}
    </span>
  );
}

export function percentTone(p: number | null | undefined, min: number) {
  if (p == null) return "text-muted-foreground";
  if (p >= min) return "text-success";
  if (p >= min - 10) return "text-warning-foreground";
  return "text-destructive";
}
