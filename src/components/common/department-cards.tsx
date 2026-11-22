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
const ACCENTS = [
  "from-indigo-600 to-violet-600",
  "from-rose-500 to-pink-600",
  "from-sky-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-fuchsia-500 to-purple-600",
  "from-cyan-500 to-sky-600",
  "from-lime-500 to-green-600",
];

const accentFor = (code: string) => {
  let h = 0;
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
};

/** Grid of department cards; each card links to that department's students only. */
export function DepartmentCards({ items, className }: { items: DepartmentCardItem[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4", className)}>
      {items.map((d) => (
        <Link
          key={d.key}
          href={d.href}
          className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
        >
          <div className={cn("mb-4 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br font-mono text-sm font-bold text-white shadow-sm", accentFor(d.code))}>
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
