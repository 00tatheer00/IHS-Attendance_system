import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BookOpenIcon, MailIcon, ShieldCheckIcon } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { getOfferings } from "@/lib/queries";
import { shortClassName } from "@/lib/format";
import { deptTheme } from "@/lib/dept-theme";
import { PageHeader } from "@/components/common/page-header";
import { AddTeacherDialog, TeacherActions } from "./teacher-dialogs";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Teachers" };

export default async function TeachersPage() {
  const { supabase, profile, userId } = await requireStaff();
  if (profile.role !== "admin") redirect("/dashboard");

  const [{ data: teachers }, { data: profiles }, offerings] = await Promise.all([
    supabase.from("teachers").select("id, full_name, email, user_id").order("full_name"),
    supabase.from("profiles").select("id, role"),
    getOfferings(supabase),
  ]);
  const roleOf = new Map((profiles ?? []).map((p) => [p.id as string, p.role as string]));

  return (
    <>
      <PageHeader
        title="Teachers"
        description="Each teacher signs in with their email and sees only the courses you assign to them."
        actions={<AddTeacherDialog />}
      />
      <div className="stagger grid gap-3 md:grid-cols-2">
        {(teachers ?? []).map((t) => {
          const courses = offerings.filter((o) => o.teacher.id === t.id);
          const role = t.user_id ? roleOf.get(t.user_id) : undefined;
          const initials = t.full_name.split(" ").filter(Boolean).slice(0, 2).map((p: string) => p[0]).join("").toUpperCase();
          return (
            <div key={t.id} className="surface lift flex flex-col rounded-3xl p-4">
              <div className="flex items-start gap-3">
                <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white", role ? "bg-hero" : "bg-muted text-muted-foreground")}>
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate font-semibold">{t.full_name}</span>
                    {role === "admin" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                        <ShieldCheckIcon className="size-3" /> Admin
                      </span>
                    )}
                    {!role && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">No login</span>}
                  </div>
                  {t.email && (
                    <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <MailIcon className="size-3" /> {t.email}
                    </div>
                  )}
                </div>
                {role && t.user_id !== userId && <TeacherActions teacherId={t.id} name={t.full_name} />}
              </div>
              <div className="mt-4 border-t pt-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <BookOpenIcon className="size-3.5" /> {courses.length} course{courses.length === 1 ? "" : "s"}
                </div>
                {courses.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {courses.map((o) => (
                      <span key={o.id} className={cn("rounded-lg px-2 py-1 text-xs font-semibold", deptTheme(o.class.department.code).soft)}>
                        {o.subject.code} · {shortClassName(o.class)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No courses yet — assign them on the Courses page.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
