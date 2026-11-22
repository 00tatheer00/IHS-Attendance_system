import { cn } from "@/lib/utils";

const tones = {
  default: { value: "text-foreground", chip: "bg-slate-100 text-slate-600" },
  brand: { value: "text-indigo-700", chip: "bg-indigo-50 text-indigo-600" },
  success: { value: "text-emerald-700", chip: "bg-emerald-50 text-emerald-600" },
  danger: { value: "text-rose-700", chip: "bg-rose-50 text-rose-600" },
  warning: { value: "text-amber-700", chip: "bg-amber-50 text-amber-600" },
  info: { value: "text-sky-700", chip: "bg-sky-50 text-sky-600" },
} as const;

/** Metric tile: white surface, soft tinted icon, coloured value. */
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
  const t = tones[tone];
  return (
    <div className={cn("surface lift rounded-2xl p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {icon && <span className={cn("flex size-8 items-center justify-center rounded-xl [&_svg]:size-4", t.chip)}>{icon}</span>}
      </div>
      <div className={cn("tabular mt-2 text-2xl font-bold tracking-tight", t.value)}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
