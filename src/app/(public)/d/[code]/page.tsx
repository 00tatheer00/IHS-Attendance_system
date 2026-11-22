import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { getPublicDepartment, searchStudents } from "@/lib/public";
import { DepartmentStudentList } from "./department-student-list";
import { deptGradient } from "@/components/common/department-cards";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const dept = await getPublicDepartment((await params).code);
  return { title: dept ? `BS ${dept.name}` : "Department" };
}

export default async function PublicDepartmentPage({ params }: { params: Promise<{ code: string }> }) {
  const dept = await getPublicDepartment((await params).code);
  if (!dept) notFound();
  const students = await searchStudents("", dept.code);

  return (
    <div className="space-y-5">
      <section className={`relative overflow-hidden rounded-3xl bg-linear-to-br ${deptGradient(dept.code)} p-5 text-white shadow-xl shadow-black/10`}>
        <div className="pointer-events-none absolute -top-12 -right-12 size-44 rounded-full bg-white/15 blur-2xl" />
        <Link href="/" className="relative inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium backdrop-blur hover:bg-white/25">
          <ArrowLeftIcon className="size-3.5" /> Departments
        </Link>
        <div className="relative mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="font-mono text-xs font-bold text-white/80">{dept.code}</p>
            <h1 className="text-2xl font-bold tracking-tight">BS {dept.name}</h1>
            <p className="mt-0.5 text-sm text-white/80">Tap your name to see attendance &amp; ID card</p>
          </div>
          <div className="rounded-2xl bg-white/20 px-3 py-2 text-center backdrop-blur">
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
