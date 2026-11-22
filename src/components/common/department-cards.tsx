import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { deptTheme } from "@/lib/dept-theme";
import { cn } from "@/lib/utils";

export interface DepartmentCardItem {
  key: string;
  href: string;
  code: string;
  name: string;
  subtitle?: string;
  count: number;
}

/** Grid of department cards; each card links to that department's students only. */
export function DepartmentCards({ items, className }: { items: DepartmentCardItem[]; className?: string }) {
  return (
    <div className={cn("stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4", className)}>
      {items.map((d) => {
        const t = deptTheme(d.code);
        return (
          <Link key={d.key} href={d.href} className={cn("surface lift pressable group relative flex flex-col overflow-hidden rounded-3xl p-4", t.ring)}>
            <div className="flex items-start justify-between">
              <div className={cn("flex size-12 items-center justify-center rounded-2xl font-mono text-[13px] font-bold tracking-wide text-white shadow-md shadow-black/10", t.solid)}>
                {d.code}
              </div>
              <span className="flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground transition-all duration-300 group-hover:bg-foreground group-hover:text-background">
                <ArrowUpRightIcon className="size-3.5" />
              </span>
            </div>
            <div className="mt-4 leading-snug font-semibold">{d.name}</div>
            {d.subtitle && <div className="truncate text-xs text-muted-foreground">{d.subtitle}</div>}
            <div className="mt-auto pt-3">
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", t.soft)}>
                <span className="tabular">{d.count}</span> students
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
