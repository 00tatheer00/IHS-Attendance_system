"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRightIcon, SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { StudentAvatar } from "@/components/students/student-avatar";
import type { Gender } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Row {
  id: string;
  roll_no: string;
  full_name: string;
  father_name: string | null;
  gender: Gender | null;
  status: string;
  has_account: boolean;
  has_cnic: boolean;
  class_label: string;
  photoUrl: string | null;
}

export function StudentTable({ students }: { students: Row[] }) {
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(150);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s
      ? students.filter(
          (x) => x.full_name.toLowerCase().includes(s) || x.roll_no.toLowerCase().includes(s) || (x.father_name ?? "").toLowerCase().includes(s),
        )
      : students;
  }, [q, students]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, roll number or father name" className="h-10 pl-9" />
      </div>

      <div className="overflow-hidden surface rounded-2xl">
        <ul className="divide-y">
          {list.slice(0, limit).map((s) => (
            <li key={s.id}>
              <Link href={`/dashboard/students/${s.id}`} className="pressable flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
                <StudentAvatar photoUrl={s.photoUrl} gender={s.gender} name={s.full_name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("truncate font-medium", s.status !== "active" && "text-muted-foreground line-through")}>{s.full_name}</span>
                    {s.status !== "active" && <span className="rounded bg-muted px-1.5 text-[11px] text-muted-foreground capitalize">{s.status}</span>}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {s.father_name ? `s/d/o ${s.father_name}` : "—"}
                  </div>
                </div>
                <div className="hidden text-right sm:block">
                  <div className="tabular font-mono text-xs font-medium">{s.roll_no}</div>
                  <div className="text-xs text-muted-foreground">{s.class_label}</div>
                </div>
                <span
                  className={cn("hidden w-24 text-right text-xs md:block", s.has_account ? "text-success" : "text-muted-foreground")}
                  title={s.has_account ? "Can sign in to the student portal" : s.has_cnic ? "No portal account yet" : "Add CNIC to create a portal account"}
                >
                  {s.has_account ? "Portal ✓" : s.has_cnic ? "No account" : "No CNIC"}
                </span>
                <ChevronRightIcon className="size-4 text-muted-foreground/60" />
              </Link>
            </li>
          ))}
        </ul>
        {!list.length && <p className="p-10 text-center text-sm text-muted-foreground">No students match “{q}”.</p>}
      </div>
      {list.length > limit && (
        <button onClick={() => setLimit((l) => l + 300)} className="w-full surface rounded-2xl py-2.5 text-sm font-medium text-brand hover:bg-muted/50">
          Show more ({list.length - limit} remaining)
        </button>
      )}
    </div>
  );
}
