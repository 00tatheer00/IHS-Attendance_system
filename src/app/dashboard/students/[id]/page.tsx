import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { STUDENT_SELECT, toCardStudents } from "@/lib/students";
import { getStudentAttendance } from "@/lib/student-attendance";
import { className, pct } from "@/lib/format";
import type { StudentWithClass } from "@/lib/types";
import { MIN_ATTENDANCE_PCT } from "@/config/institute";
import { StudentAvatar } from "@/components/students/student-avatar";
import { IdCardViewer } from "@/components/id-card/id-card-viewer";
import { AttendanceHistory } from "@/components/attendance/attendance-history";
import { percentTone } from "@/components/attendance/status-badge";
import { StatCard } from "@/components/common/stat-card";
import { StudentEditor } from "./student-editor";

export const metadata: Metadata = { title: "Student" };

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const { data } = await supabase.from("students").select(STUDENT_SELECT).eq("id", id).maybeSingle();
  if (!data) notFound();
  const student = data as unknown as StudentWithClass;

  const [[card], att] = await Promise.all([toCardStudents(supabase, [student]), getStudentAttendance(supabase, id)]);
  const codes = new Map(att.courses.map((c) => [c.offering_id, c.subject_code]));

  return (
    <>
      <Link href="/dashboard/students" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" /> Students
      </Link>

      <div className="mb-6 flex items-center gap-4">
        <StudentAvatar photoUrl={card!.photoUrl} gender={student.gender} name={student.full_name} className="size-16 rounded-2xl" />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{student.full_name}</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono font-medium text-foreground">{student.roll_no}</span> · {className(student.class)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Attendance"
              value={<span className={percentTone(att.overall, MIN_ATTENDANCE_PCT)}>{pct(att.overall)}</span>}
              hint={att.overall != null && att.overall < MIN_ATTENDANCE_PCT ? `Below ${MIN_ATTENDANCE_PCT}%` : undefined}
            />
            <StatCard label="Classes" value={att.total.total} />
            <StatCard label="Present" value={att.total.present} tone="success" />
            <StatCard label="Absent" value={att.total.absent} tone="danger" hint={att.total.excused ? `${att.total.excused} on leave` : undefined} />
          </div>

          {att.courses.length > 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {att.courses.map((c) => (
                <div key={c.offering_id} className="flex items-center justify-between rounded-xl border bg-card p-4">
                  <div>
                    <div className="font-medium">{c.subject_code}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.stats.present}/{c.stats.total - c.stats.excused} present
                    </div>
                  </div>
                  <div className={`tabular text-xl font-semibold ${percentTone(c.stats.percentage, MIN_ATTENDANCE_PCT)}`}>{pct(c.stats.percentage)}</div>
                </div>
              ))}
            </div>
          )}

          <section>
            <h2 className="mb-3 font-medium">Attendance history</h2>
            <AttendanceHistory items={att.history} subjectCode={(o) => codes.get(o)} />
          </section>

          <StudentEditor
            student={{
              id: student.id,
              full_name: student.full_name,
              father_name: student.father_name,
              gender: student.gender,
              cnic: student.cnic,
              phone: student.phone,
              status: student.status,
              remarks: student.remarks,
              has_account: !!student.user_id,
              roll_no: student.roll_no,
            }}
          />
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border bg-card p-5">
            <h2 className="mb-4 font-medium">ID card</h2>
            <IdCardViewer student={card!} scale={0.88} />
          </div>
        </aside>
      </div>
    </>
  );
}
