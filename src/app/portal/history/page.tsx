import type { Metadata } from "next";
import { getPortalStudent } from "@/lib/portal";
import { getStudentAttendance } from "@/lib/student-attendance";
import { AttendanceHistory } from "@/components/attendance/attendance-history";
import { MonthCalendar } from "@/components/attendance/month-calendar";
import { todayPK } from "@/lib/format";
import type { AttendanceStatus } from "@/lib/types";
import { LiveRefresh } from "../live-refresh";

export const metadata: Metadata = { title: "History" };

export default async function PortalHistory() {
  const { supabase, student } = await getPortalStudent();
  const att = await getStudentAttendance(supabase, student.id);
  const codes = new Map(att.courses.map((c) => [c.offering_id, c.subject_code]));

  const days = new Map<string, AttendanceStatus[]>();
  for (const h of att.history) days.set(h.session.session_date, [...(days.get(h.session.session_date) ?? []), h.status]);
  const months = [...new Set([todayPK().slice(0, 7), ...att.history.map((h) => h.session.session_date.slice(0, 7))])].sort().reverse().slice(0, 3);

  return (
    <div className="space-y-5">
      <LiveRefresh studentId={student.id} />
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Attendance history</h1>
        <p className="text-sm text-muted-foreground">
          {att.total.present} present · {att.total.absent} absent{att.total.excused ? ` · ${att.total.excused} leave` : ""}
        </p>
      </div>
      <div className="flex gap-4 px-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="size-3 rounded-full bg-success" /> Present</span>
        <span className="flex items-center gap-1.5"><span className="size-3 rounded-full bg-destructive" /> Absent</span>
        <span className="flex items-center gap-1.5"><span className="size-3 rounded-full bg-warning" /> Leave</span>
      </div>
      {months.map((m) => (
        <MonthCalendar key={m} month={m} days={days} />
      ))}
      <AttendanceHistory items={att.history} subjectCode={att.courses.length > 1 ? (o) => codes.get(o) : undefined} />
    </div>
  );
}
