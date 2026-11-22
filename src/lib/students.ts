import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CardStudent } from "@/components/id-card/id-card";
import { CLASS_SELECT, type StudentWithClass } from "@/lib/types";
import { fetchAll, signPhotos } from "@/lib/queries";

export const STUDENT_SELECT = `id, user_id, roll_no, full_name, father_name, gender, cnic, phone, class_id, photo_path, qr_token, status, remarks, class:classes(${CLASS_SELECT})`;

export async function getStudents(supabase: SupabaseClient, opts: { classId?: string } = {}) {
  const rows = await fetchAll<StudentWithClass>((a, b) => {
    let q = supabase.from("students").select(STUDENT_SELECT).order("roll_no");
    if (opts.classId) q = q.eq("class_id", opts.classId);
    return q.range(a, b) as unknown as PromiseLike<{ data: StudentWithClass[] | null; error: unknown }>;
  });
  // Natural sort so CAR-F26-100 comes after CAR-F26-99
  return rows.sort((x, y) => x.roll_no.localeCompare(y.roll_no, undefined, { numeric: true }));
}

export async function toCardStudents(supabase: SupabaseClient, students: StudentWithClass[]): Promise<CardStudent[]> {
  const photos = await signPhotos(supabase, students.map((s) => s.photo_path));
  return students.map((s) => ({
    id: s.id,
    roll_no: s.roll_no,
    full_name: s.full_name,
    father_name: s.father_name,
    gender: s.gender,
    qr_token: s.qr_token,
    photoUrl: s.photo_path ? (photos.get(s.photo_path) ?? null) : null,
    department: s.class.department.name,
    batch: s.class.batch.name,
    session: s.class.batch.session_label,
  }));
}
