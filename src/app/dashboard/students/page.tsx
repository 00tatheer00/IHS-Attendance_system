import type { Metadata } from "next";
import { UsersIcon } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { getClasses, signPhotos } from "@/lib/queries";
import { getStudents } from "@/lib/students";
import { className, shortClassName } from "@/lib/format";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { LinkButton } from "@/components/common/link-button";
import { ClassPicker } from "@/components/common/class-picker";
import { StudentTable } from "./student-table";
import { PortalAccountsButton } from "./portal-accounts-button";

export const metadata: Metadata = { title: "Students" };

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ class?: string }> }) {
  const { supabase } = await requireStaff();
  const sp = await searchParams;
  const [classes, students] = await Promise.all([getClasses(supabase), getStudents(supabase, { classId: sp.class || undefined })]);
  const photos = await signPhotos(supabase, students.map((s) => s.photo_path));

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

  const noAccount = students.filter((s) => !s.user_id && s.status === "active");
  return (
    <>
      <PageHeader
        title="Students"
        description={`${students.length} student${students.length === 1 ? "" : "s"}${sp.class ? "" : " in all classes"}`}
        actions={
          <>
            <ClassPicker classes={classes.map((c) => ({ id: c.id, label: className(c) }))} value={sp.class ?? ""} allLabel="All classes" />
            <PortalAccountsButton
              eligible={noAccount.filter((s) => s.cnic).map((s) => s.id)}
              missingCnic={noAccount.filter((s) => !s.cnic).length}
            />
          </>
        }
      />
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
    </>
  );
}
