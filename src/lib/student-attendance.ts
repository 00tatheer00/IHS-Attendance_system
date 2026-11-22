import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AttendanceStatus, CourseStats } from "@/lib/types";

export interface HistoryItem {
  id: string;
  status: AttendanceStatus;
  marked_at: string;
  method: string;
  note: string | null;
  session: { id: string; session_date: string; started_at: string; topic: string | null; offering_id: string };
}

export interface CourseSummary {
  offering_id: string;
  subject_code: string;
  subject_name: string;
  teacher: string | null;
  stats: CourseStats;
}

/** All attendance for one student, across their courses. Works for staff and for the student (RLS). */
export async function getStudentAttendance(supabase: SupabaseClient, studentId: string) {
  const [{ data: stats }, { data: offerings }, { data: history }] = await Promise.all([
    supabase.from("student_course_stats").select("*").eq("student_id", studentId),
    supabase
      .from("enrollments")
      .select("offering:course_offerings(id, subject:subjects(code, name), teacher:teachers(full_name))")
      .eq("student_id", studentId),
    supabase
      .from("attendance")
      .select("id, status, marked_at, method, note, session:sessions!inner(id, session_date, started_at, topic, offering_id, status)")
      .eq("student_id", studentId)
      .neq("session.status", "cancelled")
      .order("marked_at", { ascending: false })
      .limit(1000),
  ]);

  const statsBy = new Map(((stats ?? []) as CourseStats[]).map((s) => [s.offering_id, s]));
  type O = { offering: { id: string; subject: { code: string; name: string }; teacher: { full_name: string } | null } };
  const courses: CourseSummary[] = ((offerings ?? []) as unknown as O[])
    .filter((o) => o.offering)
    .map(({ offering: o }) => {
      const s = statsBy.get(o.id);
      return {
        offering_id: o.id,
        subject_code: o.subject.code,
        subject_name: o.subject.name,
        teacher: o.teacher?.full_name ?? null,
        stats: {
          offering_id: o.id,
          student_id: studentId,
          total: Number(s?.total ?? 0),
          present: Number(s?.present ?? 0),
          absent: Number(s?.absent ?? 0),
          excused: Number(s?.excused ?? 0),
          percentage: s?.percentage == null ? null : Number(s.percentage),
        },
      };
    });

  const items = ((history ?? []) as unknown as HistoryItem[]).sort(
    (a, b) => b.session.session_date.localeCompare(a.session.session_date) || b.session.started_at.localeCompare(a.session.started_at),
  );

  const total = courses.reduce(
    (acc, c) => ({
      total: acc.total + c.stats.total,
      present: acc.present + c.stats.present,
      absent: acc.absent + c.stats.absent,
      excused: acc.excused + c.stats.excused,
    }),
    { total: 0, present: 0, absent: 0, excused: 0 },
  );
  const counted = total.total - total.excused;
  const overall = counted > 0 ? (100 * total.present) / counted : null;

  return { courses, history: items, total, overall };
}
