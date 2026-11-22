import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3Icon, FileSpreadsheetIcon, FileTextIcon } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { getOfferings } from "@/lib/queries";
import { buildReport } from "@/lib/report";
import { resolvePeriod, type Period } from "@/lib/periods";
import { fmtDate, fmtDay, pct, shortClassName } from "@/lib/format";
import { MIN_ATTENDANCE_PCT } from "@/config/institute";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { LinkButton } from "@/components/common/link-button";
import { StatCard } from "@/components/common/stat-card";
import { percentTone } from "@/components/attendance/status-badge";
import { ReportFilters } from "./report-filters";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports" };

const CELL: Record<string, string> = { present: "bg-success", absent: "bg-destructive", excused: "bg-warning" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string; period?: Period; from?: string; to?: string; view?: "summary" | "register" }>;
}) {
  const { supabase } = await requireStaff();
  const sp = await searchParams;
  const offerings = await getOfferings(supabase);
  if (!offerings.length) {
    return (
      <>
        <PageHeader title="Reports" />
        <EmptyState icon={<BarChart3Icon />} title="No courses yet" description="Reports appear once you start taking attendance." action={<LinkButton href="/dashboard/courses">Set up courses</LinkButton>} />
      </>
    );
  }

  const courseId = offerings.some((o) => o.id === sp.course) ? sp.course! : offerings[0]!.id;
  const period: Period = sp.period ?? "month";
  const range = resolvePeriod(period, sp.from, sp.to);
  const report = (await buildReport(supabase, courseId, range.from, range.to))!;
  const view = sp.view ?? "summary";

  const atRisk = report.students.filter((s) => s.percentage != null && s.percentage < MIN_ATTENDANCE_PCT);
  const exportQs = new URLSearchParams({ course: courseId, ...(range.from && { from: range.from }), ...(range.to && { to: range.to }) });
  const rangeLabel = range.from || range.to ? `${range.from ? fmtDate(range.from) : "start"} – ${range.to ? fmtDate(range.to) : "today"}` : "All time";

  return (
    <>
      <PageHeader
        title="Reports"
        description={`${report.offering.subject.code} · ${shortClassName(report.offering.class)} · ${rangeLabel}`}
        actions={
          <>
            <a href={`/api/reports/export?format=xlsx&${exportQs}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-background px-2.5 text-sm font-medium hover:bg-muted">
              <FileSpreadsheetIcon className="size-4 text-success" /> Excel
            </a>
            <a href={`/api/reports/export?format=pdf&${exportQs}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-background px-2.5 text-sm font-medium hover:bg-muted">
              <FileTextIcon className="size-4 text-destructive" /> PDF
            </a>
          </>
        }
      />

      <ReportFilters
        courses={offerings.map((o) => ({ id: o.id, label: `${o.subject.code} · ${shortClassName(o.class)}` }))}
        course={courseId}
        period={period}
        from={sp.from ?? ""}
        to={sp.to ?? ""}
        view={view}
      />

      <div className="my-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Classes held" value={report.sessions.length} />
        <StatCard label="Students" value={report.students.length} />
        <StatCard label="Average attendance" value={<span className={percentTone(report.average, MIN_ATTENDANCE_PCT)}>{pct(report.average)}</span>} />
        <StatCard label={`Below ${MIN_ATTENDANCE_PCT}%`} value={atRisk.length} tone={atRisk.length ? "danger" : "default"} />
      </div>

      {report.sessions.length === 0 ? (
        <EmptyState icon={<BarChart3Icon />} title="No classes in this period" description="Pick a different period or course." />
      ) : view === "summary" ? (
        <>
          {/* daily strip */}
          <div className="mb-5 overflow-x-auto surface rounded-2xl p-4">
            <div className="mb-3 text-sm font-medium">Attendance per class</div>
            <div className="flex min-w-max items-end gap-1.5">
              {report.sessions.map((s) => {
                const rate = report.students.length ? s.present / report.students.length : 0;
                return (
                  <Link key={s.id} href={`/dashboard/sessions/${s.id}`} className="group flex w-9 flex-col items-center gap-1" title={`${fmtDay(s.session_date)} — ${s.present} present`}>
                    <span className="tabular text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100">{Math.round(rate * 100)}%</span>
                    <div className="flex h-24 w-6 items-end overflow-hidden rounded-md bg-muted">
                      <div className={cn("w-full rounded-md", rate * 100 >= MIN_ATTENDANCE_PCT ? "bg-success" : "bg-warning")} style={{ height: `${Math.max(4, rate * 100)}%` }} />
                    </div>
                    <span className="tabular text-[10px] text-muted-foreground">{s.session_date.slice(8)}/{s.session_date.slice(5, 7)}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="overflow-hidden surface rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Student</th>
                    <th className="px-3 py-2.5 text-right font-medium">Present</th>
                    <th className="px-3 py-2.5 text-right font-medium">Absent</th>
                    <th className="px-3 py-2.5 text-right font-medium">Leave</th>
                    <th className="w-40 px-4 py-2.5 font-medium">Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {report.students.map((s) => (
                    <tr key={s.id} className={cn(s.percentage != null && s.percentage < MIN_ATTENDANCE_PCT && "bg-destructive/4")}>
                      <td className="px-4 py-2.5">
                        <Link href={`/dashboard/students/${s.id}`} className="font-medium hover:underline">
                          {s.full_name}
                        </Link>
                        <div className="font-mono text-xs text-muted-foreground">{s.roll_no}</div>
                      </td>
                      <td className="tabular px-3 text-right">{s.present}</td>
                      <td className="tabular px-3 text-right">{s.absent}</td>
                      <td className="tabular px-3 text-right text-muted-foreground">{s.excused || "–"}</td>
                      <td className="px-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn("h-full rounded-full", (s.percentage ?? 0) >= MIN_ATTENDANCE_PCT ? "bg-success" : (s.percentage ?? 0) >= MIN_ATTENDANCE_PCT - 10 ? "bg-warning" : "bg-destructive")}
                              style={{ width: `${s.percentage ?? 0}%` }}
                            />
                          </div>
                          <span className={cn("tabular w-10 text-right font-medium", percentTone(s.percentage, MIN_ATTENDANCE_PCT))}>{pct(s.percentage)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="overflow-hidden surface rounded-2xl">
          <div className="max-h-[70vh] overflow-auto">
            <table className="text-xs">
              <thead className="sticky top-0 z-10 bg-muted">
                <tr>
                  <th className="sticky left-0 z-10 min-w-48 bg-muted px-3 py-2 text-left font-medium">Student</th>
                  {report.sessions.map((s) => (
                    <th key={s.id} className="tabular px-1 py-2 font-medium text-muted-foreground" title={s.topic ?? undefined}>
                      {s.session_date.slice(8)}
                      <div className="text-[9px] font-normal">{s.session_date.slice(5, 7)}</div>
                    </th>
                  ))}
                  <th className="px-3 py-2 font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {report.students.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="sticky left-0 bg-card px-3 py-1.5">
                      <div className="truncate font-medium">{s.full_name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{s.roll_no}</div>
                    </td>
                    {s.marks.map((m, i) => (
                      <td key={i} className="px-1 text-center">
                        <span className={cn("mx-auto block size-4 rounded", m ? CELL[m] : "bg-muted")} title={m ?? "not marked"} />
                      </td>
                    ))}
                    <td className={cn("tabular px-3 text-right font-semibold", percentTone(s.percentage, MIN_ATTENDANCE_PCT))}>{pct(s.percentage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-4 border-t px-4 py-2.5 text-xs text-muted-foreground">
            <Legend c="bg-success" l="Present" />
            <Legend c="bg-destructive" l="Absent" />
            <Legend c="bg-warning" l="Leave" />
          </div>
        </div>
      )}
    </>
  );
}

function Legend({ c, l }: { c: string; l: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-3 rounded", c)} />
      {l}
    </span>
  );
}
