import Link from "next/link";
import { ChevronRightIcon, UsersIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DepartmentCardItem {
  key: string;
  href: string;
  code: string;
  name: string;
  subtitle?: string;
  count: number;
}

/** One accent per department so each one is recognisable at a glance. */
const KNOWN: Record<string, string> = {
  CAR: "from-rose-500 to-red-600",
  DEN: "from-sky-500 to-blue-600",
  EME: "from-amber-500 to-orange-600",
  MLT: "from-emerald-500 to-teal-600",
  SUR: "from-violet-500 to-indigo-600",
  RAD: "from-fuchsia-500 to-pink-600",
  OPT: "from-cyan-500 to-sky-600",
};
const ACCENTS = [
  "from-indigo-600 to-violet-600",
  "from-lime-500 to-green-600",
  "from-pink-500 to-rose-600",
  "from-yellow-500 to-amber-600",
  "from-teal-500 to-cyan-600",
];

/** Gradient classes for a department (stable per code). */
export function deptGradient(code: string) {
  if (KNOWN[code]) return KNOWN[code];
  let h = 0;
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ACCENTS[h % ACCENTS.length]!;
}

/** Grid of department cards; each card links to that department's students only. */
export function DepartmentCards({ items, className }: { items: DepartmentCardItem[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4", className)}>
      {items.map((d) => (
        <Link
          key={d.key}
          href={d.href}
          className="pressable group relative flex flex-col overflow-hidden rounded-3xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          <div className={cn("pointer-events-none absolute -top-10 -right-10 size-28 rounded-full bg-linear-to-br opacity-15 blur-xl transition-opacity group-hover:opacity-30", deptGradient(d.code))} />
          <div className={cn("mb-4 flex size-12 items-center justify-center rounded-2xl bg-linear-to-br font-mono text-sm font-bold text-white shadow-lg shadow-black/10", deptGradient(d.code))}>
            {d.code}
          </div>
          <div className="font-semibold leading-snug">{d.name}</div>
          {d.subtitle && <div className="text-xs text-muted-foreground">{d.subtitle}</div>}
          <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <UsersIcon className="size-4" />
              <span className="tabular font-medium text-foreground">{d.count}</span> students
            </span>
            <ChevronRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>
      ))}
    </div>
  );
}
