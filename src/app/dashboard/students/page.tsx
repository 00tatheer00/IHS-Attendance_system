import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon, ListIcon, UploadIcon, UsersIcon } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { getClassSizes, getClasses, signPhotos } from "@/lib/queries";
import { getStudents } from "@/lib/students";
import { className, shortClassName } from "@/lib/format";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { LinkButton } from "@/components/common/link-button";
import { DepartmentCards } from "@/components/common/department-cards";
import { StudentTable } from "./student-table";
import { PortalAccountsButton } from "./portal-accounts-button";
import { DeleteClassButton } from "./delete-class-button";

export const metadata: Metadata = { title: "Students" };

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ class?: string }> }) {
  const { supabase, profile } = await requireStaff();
  const sp = await searchParams;
  const classes = await getClasses(supabase);

  if (!classes.length) {
    return (
      <>
        <PageHeader title="Students" />
        <EmptyState
          icon={<UsersIcon />}
          title="No students yet"
          description="Import your class lists from Excel or PDF to get started."
          action={<LinkButton href="/dashboard/import">Import students</LinkButton>}
        />
      </>
    );
  }

  // 1) Overview: one card per department (class)
  if (!sp.class) {
    const sizes = await getClassSizes(supabase);
    const total = [...sizes.values()].reduce((a, b) => a + b, 0);
    return (
      <>
        <PageHeader
          title="Students"
          description={`${total} students in ${classes.length} departments. Open a department to see only its students.`}
          actions={
            <>
              <LinkButton href="/dashboard/students?class=all" variant="outline">
                <ListIcon /> All students
              </LinkButton>
              <LinkButton href="/dashboard/import">
                <UploadIcon /> Import
              </LinkButton>
            </>
          }
        />
        <DepartmentCards
          items={classes.map((c) => ({
            key: c.id,
            href: `/dashboard/students?class=${c.id}`,
            code: c.department.code,
            name: c.department.name,
            subtitle: `${c.batch.name}${c.section ? ` · Sec ${c.section}` : ""}${c.batch.session_label ? ` · ${c.batch.session_label}` : ""}`,
            count: sizes.get(c.id) ?? 0,
            locked: c.department.is_locked,
            lockedNote: "Locked — unlock it in Settings",
          }))}
        />
      </>
    );
  }

  // 2) One department (or everyone)
  const all = sp.class === "all";
  const selected = all ? null : classes.find((c) => c.id === sp.class);
  if (!all && !selected) notFound();
  if (selected?.department.is_locked) redirect("/dashboard/students");
  const students = (await getStudents(supabase, { classId: selected?.id })).filter((s) => !s.class.department.is_locked);
  const photos = await signPhotos(supabase, students.map((s) => s.photo_path));
  const noAccount = students.filter((s) => !s.user_id && s.status === "active");

  return (
    <>
      <Link href="/dashboard/students" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" /> All departments
      </Link>
      <PageHeader
        title={selected ? className(selected) : "All students"}
        description={`${students.length} student${students.length === 1 ? "" : "s"}`}
        actions={
          <>
            <PortalAccountsButton eligible={noAccount.filter((s) => s.cnic).map((s) => s.id)} missingCnic={noAccount.filter((s) => !s.cnic).length} />
            {selected && (
              <LinkButton href={`/dashboard/id-cards?class=${selected.id}`} variant="outline">
                ID cards
              </LinkButton>
            )}
            {selected && profile.role === "admin" && (
              <DeleteClassButton classId={selected.id} label={className(selected)} code={selected.department.code} students={students.length} />
            )}
          </>
        }
      />
      {students.length ? (
        <StudentTable
          students={students.map((s) => ({
            id: s.id,
            roll_no: s.roll_no,
            full_name: s.full_name,
            father_name: s.father_name,
            gender: s.gender,
            status: s.status,
            has_account: !!s.user_id,
            has_cnic: !!s.cnic,
            class_label: shortClassName(s.class),
            photoUrl: s.photo_path ? (photos.get(s.photo_path) ?? null) : null,
          }))}
        />
      ) : (
        <EmptyState
          icon={<UsersIcon />}
          title="No students in this department"
          description="Import a class list — students are placed in their department automatically from the roll number."
          action={<LinkButton href="/dashboard/import">Import students</LinkButton>}
        />
      )}
    </>
  );
}
