import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Session } from "@/lib/types";

export interface SessionRow extends Session {
  enrolled: number;
  present: number;
  absent: number;
  excused: number;
}

/** Sessions with head-counts, newest first. */
export async function getSessions(
  supabase: SupabaseClient,
  opts: { offeringId?: string; from?: string; to?: string; status?: Session["status"][]; limit?: number } = {},
): Promise<SessionRow[]> {
  let q = supabase
    .from("sessions")
    .select("id, offering_id, session_date, started_at, closed_at, status, topic")
    .order("session_date", { ascending: false })
    .order("started_at", { ascending: false })
    .limit(opts.limit ?? 200);
  if (opts.offeringId) q = q.eq("offering_id", opts.offeringId);
  if (opts.from) q = q.gte("session_date", opts.from);
  if (opts.to) q = q.lte("session_date", opts.to);
  if (opts.status) q = q.in("status", opts.status);
  const { data: sessions } = await q;
  if (!sessions?.length) return [];
  const { data: sums } = await supabase
    .from("session_summary")
    .select("session_id, enrolled, present, absent, excused")
    .in("session_id", sessions.map((s) => s.id));
  const by = new Map((sums ?? []).map((s) => [s.session_id as string, s]));
  return (sessions as Session[]).map((s) => {
    const c = by.get(s.id);
    return { ...s, enrolled: Number(c?.enrolled ?? 0), present: Number(c?.present ?? 0), absent: Number(c?.absent ?? 0), excused: Number(c?.excused ?? 0) };
  });
}
