import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { getPublicDepartment, searchStudents } from "@/lib/public";
import { DepartmentStudentList } from "./department-student-list";

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
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" /> All departments
      </Link>
      <div>
        <p className="font-mono text-xs font-semibold text-brand">{dept.code}</p>
        <h1 className="text-2xl font-semibold tracking-tight">BS {dept.name}</h1>
        <p className="text-sm text-muted-foreground">
          {students.length} student{students.length === 1 ? "" : "s"} · tap your name to see your attendance and ID card
        </p>
      </div>
      <DepartmentStudentList
        students={students.map((s) => ({ id: s.id, roll_no: s.roll_no, full_name: s.full_name, gender: s.gender, batch: s.class.batch.name }))}
      />
    </div>
  );
}
