import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { getRoster } from "@/lib/roster";
import { className, fmtDate, fmtTime } from "@/lib/format";
import { OFFERING_SELECT, type Offering, type Session } from "@/lib/types";
import { StatCard } from "@/components/common/stat-card";
import { SessionRoster } from "./session-roster";
import { SessionActions } from "./session-actions";

export const metadata: Metadata = { title: "Class attendance" };

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const { data } = await supabase
    .from("sessions")
    .select(`id, offering_id, session_date, started_at, closed_at, status, topic, offering:course_offerings(${OFFERING_SELECT})`)
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const session = data as unknown as Session & { offering: Offering };
  const roster = await getRoster(supabase, id, session.offering_id);

  const present = roster.filter((r) => r.status === "present").length;
  const absent = roster.filter((r) => r.status === "absent").length;
  const excused = roster.filter((r) => r.status === "excused").length;
  const unmarked = roster.length - present - absent - excused;

  return (
    <>
      <Link href="/dashboard/sessions" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" /> Attendance
      </Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-brand-soft px-2 py-0.5 font-mono text-xs font-semibold text-brand">{session.offering.subject.code}</span>
            <StatusPill status={session.status} />
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{className(session.offering.class)}</h1>
          <p className="text-sm text-muted-foreground">
            {fmtDate(session.session_date)} · started {fmtTime(session.started_at)}
            {session.topic ? ` · ${session.topic}` : ""}
          </p>
        </div>
        <SessionActions sessionId={id} status={session.status} unmarked={unmarked} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Present" value={present} tone="success" hint={`of ${roster.length}`} />
        <StatCard label="Absent" value={absent} tone="danger" />
        <StatCard label="On leave" value={excused} />
        <StatCard label="Not marked" value={unmarked} hint={session.status === "open" ? "Absent when you finish" : undefined} />
      </div>

      <SessionRoster sessionId={id} roster={roster} editable={session.status !== "cancelled"} />
    </>
  );
}

function StatusPill({ status }: { status: Session["status"] }) {
  const map = {
    open: "bg-success/12 text-success",
    closed: "bg-muted text-muted-foreground",
    cancelled: "bg-destructive/10 text-destructive",
  } as const;
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${map[status]}`}>{status === "open" ? "In progress" : status}</span>;
}
