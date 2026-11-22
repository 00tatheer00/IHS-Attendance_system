import type { Metadata } from "next";
import { ContactRoundIcon } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { getClasses, getClassSizes } from "@/lib/queries";
import { getStudents, toCardStudents } from "@/lib/students";
import { className } from "@/lib/format";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { LinkButton } from "@/components/common/link-button";
import { ClassPicker } from "@/components/common/class-picker";
import { CardSheet } from "./card-sheet";

export const metadata: Metadata = { title: "ID cards" };

export default async function IdCardsPage({ searchParams }: { searchParams: Promise<{ class?: string }> }) {
  const { supabase } = await requireStaff();
  const [classes, sizes] = await Promise.all([getClasses(supabase), getClassSizes(supabase)]);
  const sp = await searchParams;
  const current = classes.find((c) => c.id === sp.class) ?? classes[0];

  if (!current) {
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

  const students = await toCardStudents(supabase, (await getStudents(supabase, { classId: current.id })).filter((s) => s.status === "active"));

  return (
    <>
      <PageHeader
        title="ID cards"
        description="Print a whole class on A4 sheets (9 per page, double-sided) or download single cards."
        actions={
          <ClassPicker
            classes={classes.map((c) => ({ id: c.id, label: `${className(c)} (${sizes.get(c.id) ?? 0})` }))}
            value={current.id}
          />
        }
      />
      <CardSheet key={current.id} students={students} title={className(current)} />
    </>
  );
}
