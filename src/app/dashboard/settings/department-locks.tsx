"use client";
import { useOptimistic, useTransition } from "react";
import { LockIcon, LockOpenIcon } from "lucide-react";
import { toast } from "sonner";
import { setDepartmentLock } from "@/features/settings/actions";
import { deptTheme } from "@/lib/dept-theme";
import { cn } from "@/lib/utils";

interface Dept {
  id: string;
  code: string;
  name: string;
  is_locked: boolean;
}

/** Department list with a lock switch per department. */
export function DepartmentLocks({ departments }: { departments: Dept[] }) {
  const [, start] = useTransition();
  const [items, setOptimistic] = useOptimistic(departments, (state, u: { id: string; locked: boolean }) =>
    state.map((d) => (d.id === u.id ? { ...d, is_locked: u.locked } : d)),
  );

  function toggle(d: Dept) {
    const locked = !d.is_locked;
    start(async () => {
      setOptimistic({ id: d.id, locked });
      const r = await setDepartmentLock(d.id, locked);
      if (r.error) toast.error(r.error);
      else toast.success(`${d.name} ${locked ? "locked" : "unlocked"}`, {
        description: locked ? "Hidden from the student portal and imports." : "Visible again in the student portal.",
      });
    });
  }

  return (
    <ul className="divide-y overflow-hidden rounded-2xl border">
      {items.map((d) => (
        <li key={d.id} className="flex items-center gap-3 px-3 py-2.5">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl font-mono text-[11px] font-bold transition-colors",
              d.is_locked ? "bg-muted text-muted-foreground" : cn("text-white", deptTheme(d.code).solid),
            )}
          >
            {d.code}
          </span>
          <span className={cn("flex-1 text-sm font-medium", d.is_locked && "text-muted-foreground")}>{d.name}</span>
          <button
            type="button"
            role="switch"
            aria-checked={!d.is_locked}
            aria-label={`${d.is_locked ? "Unlock" : "Lock"} ${d.name}`}
            onClick={() => toggle(d)}
            className={cn(
              "pressable inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors",
              d.is_locked ? "bg-muted text-muted-foreground hover:bg-muted/70" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
            )}
          >
            {d.is_locked ? <LockIcon className="size-3.5" /> : <LockOpenIcon className="size-3.5" />}
            {d.is_locked ? "Locked" : "Open"}
          </button>
        </li>
      ))}
    </ul>
  );
}
