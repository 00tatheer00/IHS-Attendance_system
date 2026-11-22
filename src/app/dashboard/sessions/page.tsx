import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheckIcon, ChevronRightIcon, RadioIcon } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { getOfferings } from "@/lib/queries";
import { getSessions } from "@/lib/sessions";
import { fmtDay, fmtTime, shortClassName } from "@/lib/format";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { LinkButton } from "@/components/common/link-button";
import { ClassPicker } from "@/components/common/class-picker";
import { StartSessionForm } from "./start-session-form";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Attendance" };

export default async function SessionsPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const { supabase } = await requireStaff();
  const sp = await searchParams;
  const offerings = await getOfferings(supabase, { activeOnly: true });

  if (!offerings.length) {
    return (
      <>
        <PageHeader title="Attendance" />
        <EmptyState
          icon={<CalendarCheckIcon />}
          title="Set up a course first"
          description="Attendance is taken per course (e.g. ICT for BS Cardiology). Create your courses, then start a class here."
          action={<LinkButton href="/dashboard/courses">Set up courses</LinkButton>}
        />
      </>
    );
  }

  const sessions = await getSessions(supabase, { offeringId: sp.course || undefined, limit: 100 });
  const label = new Map(offerings.map((o) => [o.id, `${o.subject.code} · ${shortClassName(o.class)}`]));
  const open = sessions.filter((s) => s.status === "open");

  return (
    <>
      <PageHeader title="Attendance" description="Start a class and scan ID cards — or review and correct past classes." />

      {open.length > 0 && (
        <div className="mb-5 space-y-2">
          {open.map((s) => (
            <Link
              key={s.id}
              href={`/scan/${s.id}`}
              className="flex items-center gap-3 rounded-xl border border-success/40 bg-success/8 p-4 transition-colors hover:bg-success/12"
            >
              <span className="relative flex size-3">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex size-3 rounded-full bg-success" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-medium">In progress: {label.get(s.offering_id)}</div>
                <div className="text-sm text-muted-foreground">
                  Started {fmtTime(s.started_at)} · {s.present} of {s.enrolled} marked present
                </div>
              </div>
              <span className="flex items-center gap-1 text-sm font-medium text-success">
                <RadioIcon className="size-4" /> Resume scanning
              </span>
            </Link>
          ))}
        </div>
      )}

      <StartSessionForm offerings={offerings.map((o) => ({ id: o.id, label: `${o.subject.code} — ${shortClassName(o.class)}` }))} defaultId={sp.course} />

      <div className="mt-8 mb-3 flex items-center justify-between gap-3">
        <h2 className="font-medium">Recent classes</h2>
        <ClassPicker
          param="course"
          classes={offerings.map((o) => ({ id: o.id, label: label.get(o.id)! }))}
          value={sp.course ?? ""}
          allLabel="All courses"
          className="w-56"
        />
      </div>

      {sessions.length === 0 ? (
        <EmptyState icon={<CalendarCheckIcon />} title="No classes yet" description="Classes you start will appear here." />
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {sessions.map((s) => {
            const counted = s.enrolled - s.excused;
            const rate = s.status === "closed" && counted > 0 ? Math.round((100 * s.present) / counted) : null;
            return (
              <li key={s.id}>
                <Link href={`/dashboard/sessions/${s.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50">
                  <div className="w-20 shrink-0">
                    <div className="text-sm font-medium">{fmtDay(s.session_date)}</div>
                    <div className="text-xs text-muted-foreground">{fmtTime(s.started_at)}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{label.get(s.offering_id) ?? "Course"}</div>
                    <div className="truncate text-xs text-muted-foreground">{s.topic || (s.status === "cancelled" ? "Cancelled" : "—")}</div>
                  </div>
                  <div className="text-right">
                    {s.status === "cancelled" ? (
                      <span className="text-xs text-muted-foreground">Cancelled</span>
                    ) : (
                      <>
                        <div className="tabular text-sm font-semibold">
                          {s.present}
                          <span className="font-normal text-muted-foreground">/{s.enrolled}</span>
                        </div>
                        <div className={cn("text-xs", s.status === "open" ? "text-success" : "text-muted-foreground")}>
                          {s.status === "open" ? "Open" : rate != null ? `${rate}% present` : "Closed"}
                        </div>
                      </>
                    )}
                  </div>
                  <ChevronRightIcon className="size-4 text-muted-foreground/60" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
