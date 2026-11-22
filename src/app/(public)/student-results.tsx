import Link from "next/link";
import { ChevronRightIcon, SearchXIcon } from "lucide-react";
import { StudentAvatar } from "@/components/students/student-avatar";
import { deptGradient } from "@/components/common/department-cards";
import type { PublicStudent } from "@/lib/public";
import { cn } from "@/lib/utils";

/** Search results list (shared by the Search tab). */
export function StudentResults({ results, query }: { results: PublicStudent[]; query: string }) {
  if (!results.length) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-dashed bg-card px-6 py-12 text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-muted">
          <SearchXIcon className="size-6 text-muted-foreground" />
        </div>
        <p className="font-medium">No student found for “{query}”</p>
        <p className="mt-1 text-sm text-muted-foreground">Check the spelling, or try your roll number (e.g. CAR-F26-01).</p>
      </div>
    );
  }
  return (
    <section>
      <p className="mb-2 px-1 text-xs text-muted-foreground">
        {results.length} student{results.length === 1 ? "" : "s"}
        {results.length >= 60 ? " — type more of the name to narrow down" : ""}
      </p>
      <ul className="divide-y overflow-hidden rounded-3xl border bg-card shadow-sm">
        {results.map((s) => (
          <li key={s.id}>
            <Link href={`/s/${encodeURIComponent(s.roll_no)}`} className="pressable flex items-center gap-3 px-4 py-3 hover:bg-muted/50 active:bg-muted">
              <StudentAvatar gender={s.gender} name={s.full_name} className="size-11" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{s.full_name}</div>
                <div className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                  <span className={cn("rounded-md bg-linear-to-r px-1.5 py-px font-mono text-[10px] font-bold text-white", deptGradient(s.class.department.code))}>
                    {s.class.department.code}
                  </span>
                  <span className="font-mono">{s.roll_no}</span>
                </div>
              </div>
              <ChevronRightIcon className="size-4 text-muted-foreground/60" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
