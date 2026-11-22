"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { StudentAvatar } from "@/components/students/student-avatar";
import type { Gender } from "@/lib/types";
import { SearchBox } from "../../search-box";
import { cn } from "@/lib/utils";

interface S {
  id: string;
  roll_no: string;
  full_name: string;
  gender: Gender | null;
  batch: string;
  section: string | null;
}

/** Only this department's students, filtered instantly as you type. */
export function DepartmentStudentList({ students }: { students: S[] }) {
  const [q, setQ] = useState("");
  const [section, setSection] = useState<string>("all");
  const sections = useMemo(() => [...new Set(students.map((s) => s.section).filter((x): x is string => !!x))].sort(), [students]);
  const list = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return students.filter((s) => {
      if (section !== "all" && s.section !== section) return false;
      const hay = `${s.full_name} ${s.roll_no}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [q, students, section]);

  return (
    <div className="space-y-3">
      <SearchBox onChange={setQ} placeholder="Find your name or roll number" />
      {sections.length > 1 && (
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1" role="tablist" aria-label="Section">
          {[["all", "All"], ...sections.map((s) => [s, `Section ${s}`])].map(([value, label]) => {
            const count = value === "all" ? students.length : students.filter((s) => s.section === value).length;
            const active = section === value;
            return (
              <button
                key={value}
                role="tab"
                aria-selected={active}
                onClick={() => setSection(value!)}
                className={cn(
                  "flex h-10 items-center justify-center gap-1.5 rounded-xl text-sm font-medium transition-all duration-300",
                  active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
                <span className={cn("tabular rounded-full px-1.5 text-[11px]", active ? "bg-indigo-50 text-indigo-700" : "bg-background/60")}>{count}</span>
              </button>
            );
          })}
        </div>
      )}
      {list.length ? (
        <ul className="surface stagger divide-y overflow-hidden rounded-3xl">
          {list.map((s) => (
            <li key={s.id}>
              <Link href={`/s/${encodeURIComponent(s.roll_no)}`} className="pressable flex items-center gap-3 px-4 py-3 hover:bg-muted/50 active:bg-muted">
                <StudentAvatar gender={s.gender} name={s.full_name} className="size-11" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{s.full_name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    <span className="font-mono">{s.roll_no}</span>
                    {s.section ? ` · Section ${s.section}` : ""} · {s.batch}
                  </div>
                </div>
                <ChevronRightIcon className="size-4 text-muted-foreground/60" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
          {students.length ? "No one in this department matches." : "No students in this department yet."}
        </p>
      )}
    </div>
  );
}
