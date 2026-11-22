import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, CheckCircle2Icon, TriangleAlertIcon } from "lucide-react";
import { getPublicStudent } from "@/lib/public";
import { canMiss, classesNeeded } from "@/lib/portal";
import { pct, todayPK } from "@/lib/format";
import { MIN_ATTENDANCE_PCT, PUBLIC_PORTAL } from "@/config/institute";
import type { AttendanceStatus } from "@/lib/types";
import { StudentAvatar } from "@/components/students/student-avatar";
import { ProgressRing } from "@/components/attendance/progress-ring";
import { AttendanceHistory } from "@/components/attendance/attendance-history";
import { MonthCalendar } from "@/components/attendance/month-calendar";
import { percentTone } from "@/components/attendance/status-badge";
import { IdCardViewer } from "@/components/id-card/id-card-viewer";
import { AutoRefresh } from "./auto-refresh";
import { deptTheme } from "@/lib/dept-theme";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ roll: string }> }): Promise<Metadata> {
  const { roll } = await params;
  return { title: decodeURIComponent(roll).toUpperCase() };
}

export default async function PublicStudentPage({ params }: { params: Promise<{ roll: string }> }) {
  const { roll } = await params;
  const data = await getPublicStudent(roll);
  if (!data) notFound();
  const { student, attendance: att, card } = data;

  const counted = att.total.present + att.total.absent;
  const need = classesNeeded(att.total.present, counted, MIN_ATTENDANCE_PCT);
  const spare = canMiss(att.total.present, counted, MIN_ATTENDANCE_PCT);
  const codes = new Map(att.courses.map((c) => [c.offering_id, c.subject_code]));
  const days = new Map<string, AttendanceStatus[]>();
  for (const h of att.history) days.set(h.session.session_date, [...(days.get(h.session.session_date) ?? []), h.status]);
  const months = [...new Set([todayPK().slice(0, 7), ...att.history.map((h) => h.session.session_date.slice(0, 7))])].sort().reverse().slice(0, 2);

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <AutoRefresh />
      <section className={`relative overflow-hidden rounded-3xl ${deptTheme(student.class.department.code).hero} px-5 pt-5 pb-16 text-white shadow-xl shadow-black/15`}>
        <div className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-white/15 blur-3xl" />
        <Link href={`/d/${student.class.department.code}`} className="relative inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium backdrop-blur hover:bg-white/25">
          <ArrowLeftIcon className="size-3.5" /> BS {student.class.department.name}
        </Link>
        <div className="relative mt-4 flex items-center gap-4">
          <StudentAvatar photoUrl={student.photoUrl} gender={student.gender} name={student.full_name} className="size-16 rounded-2xl ring-4 ring-white/30" />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight">{student.full_name}</h1>
            <p className="truncate text-sm text-white/85">
              <span className="font-mono font-semibold">{student.roll_no}</span> · {student.class.batch.name}
            </p>
          </div>
        </div>
      </section>

      <section className="surface relative mx-2 -mt-14 flex flex-col items-center rounded-3xl px-5 pt-6 pb-5">
        <ProgressRing value={att.overall} min={MIN_ATTENDANCE_PCT} />
        <div
          className={cn(
            "mt-4 flex items-center gap-2 rounded-full px-3 py-1.5 text-center text-sm font-medium",
            att.overall == null ? "bg-muted text-muted-foreground" : need === 0 ? "bg-success/12 text-success" : "bg-destructive/10 text-destructive",
          )}
        >
          {att.overall == null ? (
            "No classes recorded yet"
          ) : need === 0 ? (
            <>
              <CheckCircle2Icon className="size-4 shrink-0" />
              {spare > 0 ? `On track — can miss ${spare} more class${spare === 1 ? "" : "es"}` : "On track — don’t miss the next class"}
            </>
          ) : (
            <>
              <TriangleAlertIcon className="size-4 shrink-0" />
              Attend the next {need} class{need === 1 ? "" : "es"} to reach {MIN_ATTENDANCE_PCT}%
            </>
          )}
        </div>
        <div className="mt-5 grid w-full grid-cols-3 divide-x rounded-2xl bg-muted/60 py-3 text-center">
          <Tile label="Classes held" value={att.total.total} className="text-indigo-600" />
          <Tile label="Attended" value={att.total.present} className="text-emerald-600" />
          <Tile label="Absent" value={att.total.absent} className="text-rose-600" />
        </div>
        {att.total.excused > 0 && <p className="mt-2 text-xs text-muted-foreground">{att.total.excused} on approved leave (not counted)</p>}
      </section>

      {att.courses.length > 1 && (
        <section className="space-y-2">
          <h2 className="px-1 text-sm font-medium">By subject</h2>
          {att.courses.map((c) => (
            <div key={c.offering_id} className="flex items-center justify-between surface rounded-2xl p-4">
              <div>
                <div className="font-medium">{c.subject_name}</div>
                <div className="text-xs text-muted-foreground">{c.stats.present} of {c.stats.present + c.stats.absent} attended</div>
              </div>
              <div className={cn("tabular text-xl font-semibold", percentTone(c.stats.percentage, MIN_ATTENDANCE_PCT))}>{pct(c.stats.percentage)}</div>
            </div>
          ))}
        </section>
      )}

      {PUBLIC_PORTAL.cardDownload && (
        <section className="surface rounded-3xl p-5">
          <h2 className="mb-1 font-medium">ID card</h2>
          <p className="mb-4 text-sm text-muted-foreground">Print it, or keep it on your phone. Show the QR code on the back to the teacher’s camera in class.</p>
          <IdCardViewer student={card} />
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-medium">Attendance calendar</h2>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-success" /> Present</span>
            <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-destructive" /> Absent</span>
            <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-warning" /> Leave</span>
          </div>
        </div>
        {months.map((m) => (
          <MonthCalendar key={m} month={m} days={days} />
        ))}
      </section>

      <section>
        <h2 className="mb-2 px-1 text-sm font-medium">All classes</h2>
        <AttendanceHistory
          items={att.history}
          subjectCode={att.courses.length > 1 ? (o) => codes.get(o) : undefined}
          emptyText="Attendance will appear here after the first class."
        />
      </section>
    </div>
  );
}

function Tile({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div>
      <div className={cn("tabular text-2xl font-semibold", className)}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
