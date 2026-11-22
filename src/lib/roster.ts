import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAll, signPhotos } from "@/lib/queries";
import type { AttendanceStatus, Gender } from "@/lib/types";

export interface RosterEntry {
  id: string;
  roll_no: string;
  full_name: string;
  gender: Gender | null;
  qr_token: string;
  photoUrl: string | null;
  status: AttendanceStatus | null;
  marked_at: string | null;
  method: string | null;
  note: string | null;
}

/** Everyone enrolled in the session's course, with their status for this session. */
export async function getRoster(supabase: SupabaseClient, sessionId: string, offeringId: string): Promise<RosterEntry[]> {
  type E = { student: { id: string; roll_no: string; full_name: string; gender: Gender | null; qr_token: string; photo_path: string | null; status: string } };
  const [enrolled, marks] = await Promise.all([
    fetchAll<E>((a, b) =>
      supabase
        .from("enrollments")
        .select("student:students(id, roll_no, full_name, gender, qr_token, photo_path, status)")
        .eq("offering_id", offeringId)
        .range(a, b) as unknown as PromiseLike<{ data: E[] | null; error: unknown }>,
    ),
    fetchAll<{ student_id: string; status: AttendanceStatus; marked_at: string; method: string; note: string | null }>((a, b) =>
      supabase.from("attendance").select("student_id, status, marked_at, method, note").eq("session_id", sessionId).range(a, b),
    ),
  ]);
  const markBy = new Map(marks.map((m) => [m.student_id, m]));
  const students = enrolled.map((e) => e.student).filter((s) => s && (s.status === "active" || markBy.has(s.id)));
  const photos = await signPhotos(supabase, students.map((s) => s.photo_path), 6 * 3600);
  return students
    .map((s) => {
      const m = markBy.get(s.id);
      return {
        id: s.id,
        roll_no: s.roll_no,
        full_name: s.full_name,
        gender: s.gender,
        qr_token: s.qr_token,
        photoUrl: s.photo_path ? (photos.get(s.photo_path) ?? null) : null,
        status: m?.status ?? null,
        marked_at: m?.marked_at ?? null,
        method: m?.method ?? null,
        note: m?.note ?? null,
      };
    })
    .sort((a, b) => a.roll_no.localeCompare(b.roll_no, undefined, { numeric: true }));
}
