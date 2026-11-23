import type { Metadata } from "next";
import { BookOpenIcon } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { getClasses, getClassSizes, getMyDepartmentIds, getOfferingSummaries, getOfferings } from "@/lib/queries";
import { className } from "@/lib/format";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { LinkButton } from "@/components/common/link-button";
import { NewCourses } from "./new-courses";
import { CourseTeacherSelect } from "./course-teacher-select";

export const metadata: Metadata = { title: "Courses" };

export default async function CoursesPage() {
  const { supabase, profile, userId } = await requireStaff();
  const [offerings, classes, { data: subjects }, summaries, classSizes] = await Promise.all([
    getOfferings(supabase),
    getClasses(supabase),
    supabase.from("subjects").select("id, code, name").order("code"),
    getOfferingSummaries(supabase),
    getClassSizes(supabase),
  ]);
  const isAdmin = profile.role === "admin";
  const myDepts = await getMyDepartmentIds(supabase, isAdmin);
  const { data: teachers } = isAdmin
    ? await supabase.from("teachers").select("id, full_name, user_id").not("user_id", "is", null).order("full_name")
    : { data: null };
  const teacherList = (teachers ?? []).map((t) => ({ id: t.id as string, full_name: t.full_name as string }));
  const myTeacherId = (teachers ?? []).find((t) => t.user_id === userId)?.id as string | undefined;

  return (
    <>
      <PageHeader
        title="Courses"
        description="A course is a subject taught to one class. Attendance is taken per course."
        actions={
          <NewCourses
            subjects={subjects ?? []}
            classes={classes
              .filter((c) => !c.department.is_locked && (!myDepts || myDepts.has(c.department.id)))
              .map((c) => ({ id: c.id, label: className(c), batch: c.batch.name, size: classSizes.get(c.id) ?? 0 }))}
            existing={offerings.map((o) => ({ subject_id: o.subject.id, class_id: o.class.id, term_label: o.term_label }))}
            teachers={isAdmin ? teacherList : undefined}
            myTeacherId={myTeacherId}
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
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <span className="truncate">{o.subject.name}</span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {isAdmin && teacherList.length > 1 ? (
                  <CourseTeacherSelect offeringId={o.id} teacherId={o.teacher.id} teachers={teacherList} />
                ) : (
                  <>Teacher: {o.teacher.full_name}</>
                )}
              </div>
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
