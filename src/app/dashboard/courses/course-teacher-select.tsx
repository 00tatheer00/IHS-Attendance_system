"use client";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { assignCourseTeacher } from "@/features/teachers/actions";

/** Admin-only: change which teacher teaches a course. */
export function CourseTeacherSelect({ offeringId, teacherId, teachers }: { offeringId: string; teacherId: string; teachers: { id: string; full_name: string }[] }) {
  const [, start] = useTransition();
  const [value, setValue] = useOptimistic(teacherId);
  return (
    <select
      aria-label="Teacher"
      value={value}
      onChange={(e) => {
        const id = e.target.value;
        const name = teachers.find((t) => t.id === id)?.full_name;
        start(async () => {
          setValue(id);
          const r = await assignCourseTeacher(offeringId, id);
          if (r.error) toast.error(r.error);
          else toast.success(`Course assigned to ${name}`);
        });
      }}
      className="h-7 max-w-40 truncate rounded-lg border-0 bg-muted px-2 text-xs font-medium outline-none focus:ring-2 focus:ring-ring/30"
    >
      {teachers.map((t) => (
        <option key={t.id} value={t.id}>
          {t.full_name}
        </option>
      ))}
    </select>
  );
}
