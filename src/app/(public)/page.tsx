import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRightIcon, SearchXIcon } from "lucide-react";
import { getPublicDepartmentCards, searchStudents } from "@/lib/public";
import { DepartmentCards } from "@/components/common/department-cards";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { StudentAvatar } from "@/components/students/student-avatar";
import { SearchBox } from "./search-box";

export const metadata: Metadata = { title: "Check your attendance" };

export default async function PublicHome({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim();
  const searching = q.length >= 2;
  const [departments, results] = await Promise.all([getPublicDepartmentCards(), searching ? searchStudents(q) : Promise.resolve([])]);

  return (
    <div className="space-y-5">
      <section className="pt-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Check your attendance</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Choose your department, or search your name or roll number.</p>
      </section>

      <SearchBox defaultValue={q} basePath="/" placeholder="Search all students — name or roll number" />

      {searching ? (
        results.length ? (
          <section>
            <p className="mb-2 px-1 text-xs text-muted-foreground">
              {results.length} student{results.length === 1 ? "" : "s"}
              {results.length >= 60 ? " — type more of the name to narrow down" : ""}
            </p>
            <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
              {results.map((s) => (
                <li key={s.id}>
                  <Link href={`/s/${encodeURIComponent(s.roll_no)}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 active:bg-muted">
                    <StudentAvatar gender={s.gender} name={s.full_name} className="size-10" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{s.full_name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        <span className="font-mono">{s.roll_no}</span> · BS {s.class.department.name}
                      </div>
                    </div>
                    <ChevronRightIcon className="size-4 text-muted-foreground/60" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
            <SearchXIcon className="mb-3 size-6 text-muted-foreground" />
            <p className="font-medium">No student found</p>
            <p className="mt-1 text-sm text-muted-foreground">Check the spelling, or try your roll number (e.g. CAR-F26-01).</p>
          </div>
        )
      ) : (
        <>
          <section>
            <h2 className="mb-3 px-1 text-sm font-medium">Departments</h2>
            <DepartmentCards
              items={departments.map((d) => ({ key: d.id, href: `/d/${d.code}`, code: d.code, name: d.name, subtitle: `BS ${d.name}`, count: d.count }))}
            />
          </section>
          <InstallPrompt />
        </>
      )}
    </div>
  );
}
