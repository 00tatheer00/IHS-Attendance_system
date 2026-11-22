"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/common/native-select";
import { cn } from "@/lib/utils";

const PERIODS = [
  ["week", "This week"],
  ["month", "This month"],
  ["all", "All time"],
  ["custom", "Custom"],
] as const;

export function ReportFilters({
  courses,
  course,
  period,
  from,
  to,
  view,
}: {
  courses: { id: string; label: string }[];
  course: string;
  period: string;
  from: string;
  to: string;
  view: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    router.push(`${pathname}?${next}`);
  };

  return (
    <div className="flex flex-col gap-3 surface rounded-2xl p-3 lg:flex-row lg:items-center">
      <NativeSelect value={course} onChange={(e) => set({ course: e.target.value })} className="lg:w-64" aria-label="Course">
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </NativeSelect>
      <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
        {PERIODS.map(([p, label]) => (
          <button
            key={p}
            onClick={() => set({ period: p })}
            className={cn("h-7 rounded-md px-2.5 text-sm font-medium", period === p ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            {label}
          </button>
        ))}
      </div>
      {period === "custom" && (
        <div className="flex items-center gap-2">
          <Input type="date" defaultValue={from} onChange={(e) => set({ from: e.target.value })} className="w-40" aria-label="From" />
          <span className="text-muted-foreground">–</span>
          <Input type="date" defaultValue={to} onChange={(e) => set({ to: e.target.value })} className="w-40" aria-label="To" />
        </div>
      )}
      <div className="flex gap-1 rounded-lg bg-muted p-1 lg:ml-auto">
        {(
          [
            ["summary", "Summary"],
            ["register", "Register"],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            onClick={() => set({ view: v })}
            className={cn("h-7 rounded-md px-2.5 text-sm font-medium", view === v ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
