"use client";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import { SearchIcon } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { StudentAvatar } from "@/components/students/student-avatar";
import { setAttendance } from "@/features/sessions/actions";
import { fmtTime } from "@/lib/format";
import type { AttendanceStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Entry {
  id: string;
  roll_no: string;
  full_name: string;
  gender: "male" | "female" | null;
  photoUrl: string | null;
  status: AttendanceStatus | null;
  marked_at: string | null;
  method: string | null;
}

type Filter = "all" | "present" | "absent" | "excused" | "none";

const OPTIONS: { value: AttendanceStatus; label: string; on: string }[] = [
  { value: "present", label: "P", on: "bg-success text-success-foreground" },
  { value: "absent", label: "A", on: "bg-destructive text-white" },
  { value: "excused", label: "L", on: "bg-warning text-warning-foreground" },
];

export function SessionRoster({ sessionId, roster, editable }: { sessionId: string; roster: Entry[]; editable: boolean }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [, start] = useTransition();
  const [rows, setOptimistic] = useOptimistic(roster, (state, u: { id: string; status: AttendanceStatus }) =>
    state.map((r) => (r.id === u.id ? { ...r, status: u.status, method: "manual" } : r)),
  );

  function change(id: string, status: AttendanceStatus) {
    start(async () => {
      setOptimistic({ id, status });
      const r = await setAttendance({ session: sessionId, student: id, status });
      if (r.error) toast.error(r.error);
    });
  }

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && (filter === "none" ? r.status !== null : r.status !== filter)) return false;
      return !s || r.full_name.toLowerCase().includes(s) || r.roll_no.toLowerCase().includes(s);
    });
  }, [rows, q, filter]);

  const count = (f: Filter) => (f === "all" ? rows.length : rows.filter((r) => (f === "none" ? r.status === null : r.status === f)).length);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 rounded-xl bg-muted p-1">
          {(
            [
              ["all", "All"],
              ["present", "Present"],
              ["absent", "Absent"],
              ["excused", "Leave"],
              ["none", "Not marked"],
            ] as const
          ).map(([f, label]) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn("h-8 rounded-lg px-3 text-sm font-medium", filter === f ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {label} <span className="tabular text-xs text-muted-foreground">{count(f)}</span>
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="pl-8" />
        </div>
      </div>

      <ul className="divide-y overflow-hidden rounded-xl border bg-card">
        {visible.map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
            <StudentAvatar photoUrl={r.photoUrl} gender={r.gender} name={r.full_name} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{r.full_name}</div>
              <div className="truncate text-xs text-muted-foreground">
                <span className="font-mono">{r.roll_no}</span>
                {r.status === "present" && r.marked_at && ` · ${r.method === "qr" ? "scanned" : "marked"} ${fmtTime(r.marked_at)}`}
              </div>
            </div>
            <div className="inline-flex rounded-lg bg-muted p-0.5" role="radiogroup" aria-label={`Status for ${r.full_name}`}>
              {OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={r.status === o.value}
                  aria-label={o.value}
                  title={o.value === "excused" ? "Leave" : o.value[0]!.toUpperCase() + o.value.slice(1)}
                  disabled={!editable}
                  onClick={() => r.status !== o.value && change(r.id, o.value)}
                  className={cn(
                    "size-8 rounded-md text-xs font-semibold transition-colors",
                    r.status === o.value ? o.on : "text-muted-foreground hover:bg-card hover:text-foreground",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </li>
        ))}
        {!visible.length && <li className="p-8 text-center text-sm text-muted-foreground">No students here.</li>}
      </ul>
    </div>
  );
}
