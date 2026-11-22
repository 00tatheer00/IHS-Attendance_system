import { cn } from "@/lib/utils";

const tones = {
  default: { value: "text-foreground", chip: "from-indigo-500 to-violet-500" },
  brand: { value: "text-indigo-600", chip: "from-indigo-500 to-violet-500" },
  success: { value: "text-emerald-600", chip: "from-emerald-500 to-teal-500" },
  danger: { value: "text-rose-600", chip: "from-rose-500 to-pink-500" },
  warning: { value: "text-amber-600", chip: "from-amber-400 to-orange-500" },
  info: { value: "text-sky-600", chip: "from-sky-500 to-cyan-500" },
} as const;

/** Colourful metric tile. */
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
    <div className={cn("relative overflow-hidden rounded-2xl border bg-card p-4 shadow-sm", className)}>
      <div className={cn("pointer-events-none absolute -top-8 -right-8 size-24 rounded-full bg-linear-to-br opacity-10 blur-xl", t.chip)} />
      <div className="relative flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {icon && (
          <span className={cn("flex size-8 items-center justify-center rounded-xl bg-linear-to-br text-white shadow-sm [&_svg]:size-4", t.chip)}>{icon}</span>
        )}
      </div>
      <div className={cn("tabular relative mt-2 text-2xl font-bold tracking-tight", t.value)}>{value}</div>
      {hint && <div className="relative mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
