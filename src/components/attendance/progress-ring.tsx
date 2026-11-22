import { cn } from "@/lib/utils";

/** Circular attendance meter. Green at/above the minimum, amber near it, red below. */
export function ProgressRing({
  value,
  min,
  size = 168,
  stroke = 14,
  label = "attendance",
  className,
}: {
  value: number | null;
  min: number;
  size?: number;
  stroke?: number;
  label?: string;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = value == null ? 0 : Math.max(0, Math.min(100, value));
  const color =
    value == null ? "var(--muted-foreground)" : v >= min ? "var(--success)" : v >= min - 10 ? "var(--warning)" : "var(--destructive)";
  const minAngle = (min / 100) * 2 * Math.PI - Math.PI / 2;

  return (
    <div className={cn("relative inline-grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-0" role="img" aria-label={`${Math.round(v)}% ${label}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(.2,.8,.2,1)" }}
        />
        {/* tick marking the minimum requirement */}
        <line
          x1={size / 2 + (r - stroke / 2 - 3) * Math.cos(minAngle)}
          y1={size / 2 + (r - stroke / 2 - 3) * Math.sin(minAngle)}
          x2={size / 2 + (r + stroke / 2 + 3) * Math.cos(minAngle)}
          y2={size / 2 + (r + stroke / 2 + 3) * Math.sin(minAngle)}
          stroke="var(--foreground)"
          strokeOpacity={0.35}
          strokeWidth={2}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular text-4xl font-semibold tracking-tight">{value == null ? "—" : `${Math.round(v)}%`}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
