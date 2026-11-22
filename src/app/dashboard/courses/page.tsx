import type { Metadata } from "next";
import { BookOpenIcon } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { getClasses, getClassSizes, getOfferingSummaries, getOfferings } from "@/lib/queries";
import { className } from "@/lib/format";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { LinkButton } from "@/components/common/link-button";
import { NewCourses } from "./new-courses";

export const metadata: Metadata = { title: "Courses" };

export default async function CoursesPage() {
  const { supabase } = await requireStaff();
  const [offerings, classes, { data: subjects }, summaries, classSizes] = await Promise.all([
    getOfferings(supabase),
    getClasses(supabase),
    supabase.from("subjects").select("id, code, name").order("code"),
    getOfferingSummaries(supabase),
    getClassSizes(supabase),
  ]);

  return (
    <>
      <PageHeader
        title="Courses"
        description="A course is a subject taught to one class. Attendance is taken per course."
        actions={
          <NewCourses
            subjects={subjects ?? []}
            classes={classes
              .filter((c) => !c.department.is_locked)
              .map((c) => ({ id: c.id, label: className(c), batch: c.batch.name, size: classSizes.get(c.id) ?? 0 }))}
            existing={offerings.map((o) => ({ subject_id: o.subject.id, class_id: o.class.id, term_label: o.term_label }))}
          />
        }
      />

      {offerings.length === 0 ? (
        <EmptyState
          icon={<BookOpenIcon />}
          title="No courses yet"
          description={
            classes.length
              ? "Add ICT to the classes you teach to start taking attendance."
              : "Import your students first — classes are created automatically from roll numbers."
          }
          action={!classes.length && <LinkButton href="/dashboard/import">Import students</LinkButton>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {offerings.map((o) => (
            <div key={o.id} className="flex flex-col surface rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="rounded-md bg-brand-soft px-2 py-0.5 font-mono text-xs font-semibold text-brand">{o.subject.code}</span>
                <span className="text-xs text-muted-foreground">{o.term_label}</span>
              </div>
              <h3 className="mt-3 font-medium leading-snug">{className(o.class)}</h3>
              <p className="text-sm text-muted-foreground">{o.subject.name}</p>
              <div className="mt-4 flex gap-4 border-t pt-3 text-sm">
                <div>
                  <div className="tabular font-semibold">{summaries.get(o.id)?.students ?? 0}</div>
                  <div className="text-xs text-muted-foreground">students</div>
                </div>
                <div>
                  <div className="tabular font-semibold">{summaries.get(o.id)?.sessions ?? 0}</div>
                  <div className="text-xs text-muted-foreground">classes held</div>
                </div>
                <div className="ml-auto self-center">
                  <LinkButton size="sm" variant="outline" href={`/dashboard/reports?course=${o.id}`}>
                    Report
                  </LinkButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
