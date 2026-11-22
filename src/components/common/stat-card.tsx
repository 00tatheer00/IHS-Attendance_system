import { cn } from "@/lib/utils";

const tones = {
  default: "text-foreground",
  brand: "text-brand",
  success: "text-success",
  danger: "text-destructive",
  warning: "text-warning-foreground",
} as const;

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: keyof typeof tones;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border bg-card p-4", className)}>
      <div className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        {icon && <span className="text-muted-foreground/70 [&_svg]:size-4">{icon}</span>}
      </div>
      <div className={cn("tabular mt-2 text-2xl font-semibold tracking-tight", tones[tone])}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
