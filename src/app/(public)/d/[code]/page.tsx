import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, LockIcon } from "lucide-react";
import { getPublicDepartment, searchStudents } from "@/lib/public";
import { DepartmentStudentList } from "./department-student-list";
import { deptTheme } from "@/lib/dept-theme";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const dept = await getPublicDepartment((await params).code);
  return { title: dept ? `BS ${dept.name}` : "Department" };
}

export default async function PublicDepartmentPage({ params }: { params: Promise<{ code: string }> }) {
  const dept = await getPublicDepartment((await params).code);
  if (!dept) notFound();
  if (dept.is_locked) return <LockedDepartment name={dept.name} code={dept.code} />;
  const students = await searchStudents("", dept.code);

  return (
    <div className="space-y-5">
      <section className={`relative overflow-hidden rounded-3xl ${deptTheme(dept.code).hero} p-5 text-white shadow-xl shadow-black/15`}>
        <div className="pointer-events-none absolute -top-16 -right-12 size-52 rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 size-44 rounded-full bg-black/20 blur-3xl" />
        <Link href="/" className="relative inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium backdrop-blur hover:bg-white/25">
          <ArrowLeftIcon className="size-3.5" /> Departments
        </Link>
        <div className="relative mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="font-mono text-xs font-bold text-white/80">{dept.code}</p>
            <h1 className="text-2xl font-bold tracking-tight">BS {dept.name}</h1>
            <p className="mt-0.5 text-sm text-white/80">Tap your name to see attendance &amp; ID card</p>
          </div>
          <div className="rounded-2xl bg-white/15 px-3.5 py-2 text-center ring-1 ring-white/20 backdrop-blur">
            <div className="tabular text-2xl leading-none font-bold">{students.length}</div>
            <div className="text-[10px] text-white/80">students</div>
          </div>
        </div>
      </section>
      <DepartmentStudentList
        students={students.map((s) => ({ id: s.id, roll_no: s.roll_no, full_name: s.full_name, gender: s.gender, batch: s.class.batch.name }))}
      />
    </div>
  );
}

function LockedDepartment({ name, code }: { name: string; code: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-3xl bg-muted text-muted-foreground">
        <LockIcon className="size-7" />
      </div>
      <p className="font-mono text-xs font-semibold text-muted-foreground">{code}</p>
      <h1 className="text-xl font-bold tracking-tight">BS {name} is locked</h1>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">Attendance for this department isn’t available here yet.</p>
      <Link href="/" className="pressable mt-6 inline-flex h-10 items-center gap-1.5 rounded-xl border bg-card px-4 text-sm font-medium hover:bg-muted">
        <ArrowLeftIcon className="size-4" /> All departments
      </Link>
    </div>
  );
}
