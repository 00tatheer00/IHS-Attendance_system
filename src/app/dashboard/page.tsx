import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangleIcon, BookOpenIcon, CalendarCheckIcon, ChevronRightIcon, UploadIcon, UsersIcon } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { getOfferings, getClassSizes } from "@/lib/queries";
import { getSessions } from "@/lib/sessions";
import { resolvePeriod } from "@/lib/periods";
import { fmtDay, fmtTime, pct, shortClassName } from "@/lib/format";
import { MIN_ATTENDANCE_PCT } from "@/config/institute";
import { StatCard } from "@/components/common/stat-card";
import { LinkButton } from "@/components/common/link-button";
import { percentTone } from "@/components/attendance/status-badge";
import { StartSessionForm } from "./sessions/start-session-form";

export const metadata: Metadata = { title: "Home" };

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Karachi" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default async function DashboardHome() {
  const { supabase, profile } = await requireStaff();
  const week = resolvePeriod("week");
  const [offerings, classSizes, sessions, { data: risk }] = await Promise.all([
    getOfferings(supabase, { activeOnly: true }),
    getClassSizes(supabase),
    getSessions(supabase, { from: week.from!, limit: 200 }),
    supabase
      .from("student_course_stats")
      .select("student_id, offering_id, total, present, percentage, student:students(full_name, roll_no, status)")
      .lt("percentage", MIN_ATTENDANCE_PCT)
      .gte("total", 3)
      .order("percentage")
      .limit(8),
  ]);

  const firstName = profile.full_name.split(" ")[0];
  const totalStudents = [...classSizes.values()].reduce((a, b) => a + b, 0);
  const label = new Map(offerings.map((o) => [o.id, `${o.subject.code} · ${shortClassName(o.class)}`]));
  const held = sessions.filter((s) => s.status !== "cancelled");
  const weekRate = (() => {
    const done = held.filter((s) => s.status === "closed");
    const p = done.reduce((a, s) => a + s.present, 0);
    const d = done.reduce((a, s) => a + s.enrolled - s.excused, 0);
    return d ? (100 * p) / d : null;
  })();

  // Onboarding: guide first-time setup in order.
  if (!totalStudents || !offerings.length) {
    return (
      <>
        <h1 className="text-2xl font-semibold tracking-tight">{greeting()}, {firstName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Let’s get your classes ready. It takes about five minutes.</p>
        <ol className="mt-6 space-y-3">
          <Step n={1} done={totalStudents > 0} title="Import your students" text="Upload the class list (Excel or PDF). You’ll review it before saving." href="/dashboard/import" icon={<UploadIcon />} />
          <Step n={2} done={offerings.length > 0} title="Add ICT to your classes" text="Pick the classes you teach; students are enrolled automatically." href="/dashboard/courses" icon={<BookOpenIcon />} />
          <Step n={3} done={false} title="Print ID cards" text="9 cards per A4 sheet, double-sided, with each student’s QR code." href="/dashboard/id-cards" icon={<UsersIcon />} />
        </ol>
      </>
    );
  }

  const open = sessions.filter((s) => s.status === "open");
  type Risk = { student_id: string; offering_id: string; total: number; present: number; percentage: number; student: { full_name: string; roll_no: string; status: string } };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{greeting()}, {firstName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {held.length ? `${held.length} class${held.length === 1 ? "" : "es"} this week.` : "No classes yet this week."}
        </p>
      </div>

      {open.map((s) => (
        <Link key={s.id} href={`/scan/${s.id}`} className="mb-4 flex items-center gap-3 rounded-xl border border-success/40 bg-success/8 p-4 hover:bg-success/12">
          <span className="relative flex size-3">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex size-3 rounded-full bg-success" />
          </span>
          <div className="flex-1">
            <div className="font-medium">Class in progress — {label.get(s.offering_id)}</div>
            <div className="text-sm text-muted-foreground">{s.present} of {s.enrolled} present · started {fmtTime(s.started_at)}</div>
          </div>
          <span className="text-sm font-medium text-success">Resume →</span>
        </Link>
      ))}

      <StartSessionForm offerings={offerings.map((o) => ({ id: o.id, label: `${o.subject.code} — ${shortClassName(o.class)}` }))} />

      <div className="my-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Students" value={totalStudents} icon={<UsersIcon />} />
        <StatCard label="Courses" value={offerings.length} icon={<BookOpenIcon />} />
        <StatCard label="Classes this week" value={held.length} icon={<CalendarCheckIcon />} />
        <StatCard
          label="Attendance this week"
          value={<span className={percentTone(weekRate, MIN_ATTENDANCE_PCT)}>{pct(weekRate)}</span>}
          icon={<CalendarCheckIcon />}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-medium">This week</h2>
            <Link href="/dashboard/sessions" className="text-sm text-brand hover:underline">All classes</Link>
          </div>
          {held.length ? (
            <ul className="divide-y">
              {held.slice(0, 6).map((s) => (
                <li key={s.id}>
                  <Link href={`/dashboard/sessions/${s.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50">
                    <div className="w-24 text-sm">{fmtDay(s.session_date)}</div>
                    <div className="min-w-0 flex-1 truncate text-sm">{label.get(s.offering_id)}</div>
                    <div className="tabular text-sm font-medium">{s.present}<span className="text-muted-foreground">/{s.enrolled}</span></div>
                    <ChevronRightIcon className="size-4 text-muted-foreground/60" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-sm text-muted-foreground">Start a class above and it will show up here.</p>
          )}
        </section>

        <section className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="flex items-center gap-2 font-medium">
              <AlertTriangleIcon className="size-4 text-warning-foreground" /> Below {MIN_ATTENDANCE_PCT}%
            </h2>
            <Link href="/dashboard/reports" className="text-sm text-brand hover:underline">Reports</Link>
          </div>
          {(risk as unknown as Risk[] | null)?.length ? (
            <ul className="divide-y">
              {(risk as unknown as Risk[]).filter((r) => r.student?.status === "active").map((r) => (
                <li key={r.student_id + r.offering_id}>
                  <Link href={`/dashboard/students/${r.student_id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{r.student.full_name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {r.student.roll_no} · {label.get(r.offering_id) ?? ""} · {r.present}/{r.total}
                      </div>
                    </div>
                    <span className={`tabular font-semibold ${percentTone(Number(r.percentage), MIN_ATTENDANCE_PCT)}`}>{pct(Number(r.percentage))}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-sm text-muted-foreground">Nobody is below the minimum. 👏</p>
          )}
        </section>
      </div>
    </>
  );
}

function Step({ n, done, title, text, href, icon }: { n: number; done: boolean; title: string; text: string; href: string; icon: React.ReactNode }) {
  return (
    <li className="flex items-center gap-4 rounded-xl border bg-card p-4">
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${done ? "bg-success text-success-foreground" : "bg-brand-soft text-brand"}`}>
        {done ? "✓" : n}
      </span>
      <div className="min-w-0 flex-1">
        <div className={`font-medium ${done ? "text-muted-foreground line-through" : ""}`}>{title}</div>
        <div className="text-sm text-muted-foreground">{text}</div>
      </div>
      {!done && (
        <LinkButton href={href} variant="outline">
          {icon} Open
        </LinkButton>
      )}
    </li>
  );
}
