import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon, ContactRoundIcon } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { getClassSizes, getClasses } from "@/lib/queries";
import { getStudents, toCardStudents } from "@/lib/students";
import { className } from "@/lib/format";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { LinkButton } from "@/components/common/link-button";
import { DepartmentCards } from "@/components/common/department-cards";
import { CardSheet } from "./card-sheet";

export const metadata: Metadata = { title: "ID cards" };

export default async function IdCardsPage({ searchParams }: { searchParams: Promise<{ class?: string }> }) {
  const { supabase } = await requireStaff();
  const [classes, sizes] = await Promise.all([getClasses(supabase), getClassSizes(supabase)]);
  const sp = await searchParams;

  if (!classes.length) {
    return (
      <>
        <PageHeader title="ID cards" />
        <EmptyState
          icon={<ContactRoundIcon />}
          title="No students yet"
          description="Import a class list and every student gets an ID card with a unique QR code."
          action={<LinkButton href="/dashboard/import">Import students</LinkButton>}
        />
      </>
    );
  }

  if (!sp.class) {
    return (
      <>
        <PageHeader title="ID cards" description="Choose a department to preview, download or print its students’ cards." />
        <DepartmentCards
          items={classes.map((c) => ({
            key: c.id,
            href: `/dashboard/id-cards?class=${c.id}`,
            code: c.department.code,
            name: c.section ? `${c.department.name} · ${c.section}` : c.department.name,
            subtitle: `${c.section ? `Section ${c.section} · ` : ""}${c.batch.name}`,
            badge: c.section ?? undefined,
            count: sizes.get(c.id) ?? 0,
            locked: c.department.is_locked,
            lockedNote: "Locked — unlock it in Settings",
          }))}
        />
      </>
    );
  }

  const current = classes.find((c) => c.id === sp.class);
  if (!current) notFound();
  if (current.department.is_locked) redirect("/dashboard/id-cards");
  const students = await toCardStudents(supabase, (await getStudents(supabase, { classId: current.id })).filter((s) => s.status === "active"));

  return (
    <>
      <Link href="/dashboard/id-cards" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" /> All departments
      </Link>
      <PageHeader
        title={`ID cards · ${className(current)}`}
        description="Open any student’s card to download it (PDF front + back, or PNG), or print the whole department on A4 sheets."
      />
      {students.length ? (
        <CardSheet key={current.id} students={students} title={className(current)} />
      ) : (
        <EmptyState icon={<ContactRoundIcon />} title="No students in this department" />
      )}
    </>
  );
}
