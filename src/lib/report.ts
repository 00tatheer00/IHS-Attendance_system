import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAll } from "@/lib/queries";
import { OFFERING_SELECT, type AttendanceStatus, type Offering } from "@/lib/types";

export interface ReportStudent {
  id: string;
  roll_no: string;
  full_name: string;
  father_name: string | null;
  marks: (AttendanceStatus | null)[]; // aligned with `sessions`
  present: number;
  absent: number;
  excused: number;
  percentage: number | null;
}

export interface Report {
  offering: Offering;
  from: string | null;
  to: string | null;
  sessions: { id: string; session_date: string; topic: string | null; present: number }[];
  students: ReportStudent[];
  average: number | null;
}

/** Attendance register for one course and date range. Used by the page and the Excel/PDF exports. */
export async function buildReport(supabase: SupabaseClient, offeringId: string, from?: string | null, to?: string | null): Promise<Report | null> {
  const { data: off } = await supabase.from("course_offerings").select(OFFERING_SELECT).eq("id", offeringId).maybeSingle();
  if (!off) return null;

  let sq = supabase
    .from("sessions")
    .select("id, session_date, started_at, topic")
    .eq("offering_id", offeringId)
    .neq("status", "cancelled")
    .order("session_date")
    .order("started_at");
  if (from) sq = sq.gte("session_date", from);
  if (to) sq = sq.lte("session_date", to);
  const { data: sessions } = await sq.limit(1000);
  const sess = sessions ?? [];

  type E = { student: { id: string; roll_no: string; full_name: string; father_name: string | null; status: string } };
  const enrolled = await fetchAll<E>((a, b) =>
    supabase
      .from("enrollments")
      .select("student:students(id, roll_no, full_name, father_name, status)")
      .eq("offering_id", offeringId)
      .range(a, b) as unknown as PromiseLike<{ data: E[] | null; error: unknown }>,
  );

  const marks: { session_id: string; student_id: string; status: AttendanceStatus }[] = [];
  for (let i = 0; i < sess.length; i += 50) {
    const ids = sess.slice(i, i + 50).map((s) => s.id);
    marks.push(
      ...(await fetchAll<{ session_id: string; student_id: string; status: AttendanceStatus }>((a, b) =>
        supabase.from("attendance").select("session_id, student_id, status").in("session_id", ids).range(a, b),
      )),
    );
  }
  const markOf = new Map(marks.map((m) => [`${m.session_id}:${m.student_id}`, m.status]));
  const idx = new Map(sess.map((s, i) => [s.id, i]));
  const presentPerSession = sess.map(() => 0);
  for (const m of marks) if (m.status === "present") presentPerSession[idx.get(m.session_id)!]!++;

  const students: ReportStudent[] = enrolled
    .map((e) => e.student)
    .filter(Boolean)
    .map((s) => {
      const row = sess.map((x) => markOf.get(`${x.id}:${s.id}`) ?? null);
      const present = row.filter((r) => r === "present").length;
      const absent = row.filter((r) => r === "absent").length;
      const excused = row.filter((r) => r === "excused").length;
      const counted = present + absent;
      return {
        id: s.id,
        roll_no: s.roll_no,
        full_name: s.full_name,
        father_name: s.father_name,
        marks: row,
        present,
        absent,
        excused,
        percentage: counted ? (100 * present) / counted : null,
        active: s.status === "active",
      };
    })
    // keep inactive students only if they have records in range
    .filter((s) => s.active || s.present + s.absent + s.excused > 0)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(({ active, ...s }) => s)
    .sort((a, b) => a.roll_no.localeCompare(b.roll_no, undefined, { numeric: true }));

  const withPct = students.filter((s) => s.percentage != null);
  return {
    offering: off as unknown as Offering,
    from: from ?? null,
    to: to ?? null,
    sessions: sess.map((s, i) => ({ id: s.id, session_date: s.session_date, topic: s.topic, present: presentPerSession[i]! })),
    students,
    average: withPct.length ? withPct.reduce((a, s) => a + s.percentage!, 0) / withPct.length : null,
  };
}
