import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getRoster } from "@/lib/roster";
import { fmtDate, shortClassName } from "@/lib/format";
import { OFFERING_SELECT, type Offering, type Session } from "@/lib/types";
import { Scanner } from "./scanner";

export const metadata: Metadata = { title: "Scanner" };

export default async function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const { data } = await supabase
    .from("sessions")
    .select(`id, offering_id, session_date, started_at, status, topic, offering:course_offerings(${OFFERING_SELECT})`)
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const session = data as unknown as Session & { offering: Offering };
  const roster = await getRoster(supabase, id, session.offering_id);

  return (
    <Scanner
      sessionId={id}
      status={session.status}
      title={`${session.offering.subject.code} · ${shortClassName(session.offering.class)}`}
      subtitle={fmtDate(session.session_date)}
      roster={roster.map((r) => ({
        id: r.id,
        roll_no: r.roll_no,
        full_name: r.full_name,
        gender: r.gender,
        qr_token: r.qr_token,
        photoUrl: r.photoUrl,
        present: r.status === "present",
      }))}
    />
  );
}
