import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2Icon, ChevronRightIcon, TriangleAlertIcon } from "lucide-react";
import { getPortalStudent, canMiss, classesNeeded } from "@/lib/portal";
import { getStudentAttendance } from "@/lib/student-attendance";
import { className, pct } from "@/lib/format";
import { MIN_ATTENDANCE_PCT } from "@/config/institute";
import { ProgressRing } from "@/components/attendance/progress-ring";
import { AttendanceHistory } from "@/components/attendance/attendance-history";
import { percentTone } from "@/components/attendance/status-badge";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { LiveRefresh } from "./live-refresh";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "My attendance" };

export default async function PortalHome() {
  const { supabase, student } = await getPortalStudent();
  const att = await getStudentAttendance(supabase, student.id);
  const counted = att.total.present + att.total.absent;
  const need = classesNeeded(att.total.present, counted, MIN_ATTENDANCE_PCT);
  const spare = canMiss(att.total.present, counted, MIN_ATTENDANCE_PCT);
  const codes = new Map(att.courses.map((c) => [c.offering_id, c.subject_code]));

  return (
    <div className="space-y-5">
      <LiveRefresh studentId={student.id} />

      <div>
        <h1 className="text-xl font-semibold tracking-tight">Hi, {student.full_name.split(" ")[0]} 👋</h1>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono">{student.roll_no}</span> · {className(student.class)}
        </p>
      </div>

      <section className="flex flex-col items-center surface rounded-3xl px-5 pt-6 pb-5">
        <ProgressRing value={att.overall} min={MIN_ATTENDANCE_PCT} />
        <div
          className={cn(
            "mt-4 flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium",
            att.overall == null
              ? "bg-muted text-muted-foreground"
              : need === 0
                ? "bg-success/12 text-success"
                : "bg-destructive/10 text-destructive",
          )}
        >
          {att.overall == null ? (
            "No classes recorded yet"
          ) : need === 0 ? (
            <>
              <CheckCircle2Icon className="size-4" />
              {spare > 0 ? `On track — you can miss ${spare} more class${spare === 1 ? "" : "es"}` : `On track — don’t miss the next class`}
            </>
          ) : (
            <>
              <TriangleAlertIcon className="size-4" />
              Attend the next {need} class{need === 1 ? "" : "es"} to reach {MIN_ATTENDANCE_PCT}%
            </>
          )}
        </div>

        <div className="mt-5 grid w-full grid-cols-3 divide-x rounded-2xl bg-muted/60 py-3 text-center">
          <Tile label="Classes" value={att.total.total} />
          <Tile label="Present" value={att.total.present} className="text-success" />
          <Tile label="Absent" value={att.total.absent} className="text-destructive" />
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
                <div className="text-xs text-muted-foreground">
                  {c.stats.present} of {c.stats.present + c.stats.absent} attended{c.teacher ? ` · ${c.teacher}` : ""}
                </div>
              </div>
              <div className={cn("tabular text-xl font-semibold", percentTone(c.stats.percentage, MIN_ATTENDANCE_PCT))}>{pct(c.stats.percentage)}</div>
            </div>
          ))}
        </section>
      )}

      <InstallPrompt />

      <section>
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-sm font-medium">Recent classes</h2>
          {att.history.length > 5 && (
            <Link href="/portal/history" className="flex items-center text-sm font-medium text-brand">
              See all <ChevronRightIcon className="size-4" />
            </Link>
          )}
        </div>
        <AttendanceHistory
          items={att.history.slice(0, 5)}
          subjectCode={att.courses.length > 1 ? (o) => codes.get(o) : undefined}
          emptyText="Your attendance will appear here after your first class."
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
