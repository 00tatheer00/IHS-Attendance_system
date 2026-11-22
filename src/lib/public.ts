import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { CLASS_SELECT, type ClassRow, type Gender } from "@/lib/types";
import { getStudentAttendance } from "@/lib/student-attendance";
import { signPhotos } from "@/lib/queries";
import type { CardStudent } from "@/components/id-card/card-pdf";

/**
 * Data for the public (no-login) student portal. Uses the service client on
 * the server, so every function here selects ONLY fields that are safe to
 * show publicly — never CNIC, phone or remarks.
 */

export interface PublicStudent {
  id: string;
  roll_no: string;
  full_name: string;
  gender: Gender | null;
  class: ClassRow;
}

const PUBLIC_SELECT = `id, roll_no, full_name, gender, class:classes(${CLASS_SELECT})`;

/** Keep only characters that can appear in names/roll numbers (also makes the filter injection-safe). */
const clean = (q: string) => q.replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60);

async function getPublicDepartmentsRaw() {
  const db = createAdminClient();
  const { data } = await db.from("departments").select("id, code, name").order("code");
  return (data ?? []) as { id: string; code: string; name: string }[];
}

async function searchStudentsRaw(query: string, deptCode?: string): Promise<PublicStudent[]> {
  const q = clean(query);
  if (q.length < 2 && !deptCode) return [];
  const db = createAdminClient();

  let classIds: string[] | null = null;
  if (deptCode) {
    const { data: dept } = await db.from("departments").select("id").eq("code", deptCode).maybeSingle();
    if (!dept) return [];
    const { data: cls } = await db.from("classes").select("id").eq("department_id", dept.id);
    classIds = (cls ?? []).map((c) => c.id);
    if (!classIds.length) return [];
  }

  let req = db.from("students").select(PUBLIC_SELECT).eq("status", "active").limit(q ? 60 : 1000);
  if (classIds) req = req.in("class_id", classIds);
  if (q) {
    // every word must match the name, or the whole query matches the roll number
    const words = q.split(" ").filter(Boolean);
    req = req.or(`roll_no.ilike.%${q.replace(/\s/g, "")}%,and(${words.map((w) => `full_name.ilike.%${w}%`).join(",")})`);
  }
  const { data } = await req;
  return ((data ?? []) as unknown as PublicStudent[]).sort((a, b) => a.roll_no.localeCompare(b.roll_no, undefined, { numeric: true }));
}

async function getPublicStudentRaw(roll: string) {
  const rollNo = decodeURIComponent(roll).toUpperCase().replace(/[^A-Z0-9-]/g, "");
  const db = createAdminClient();
  const { data } = await db
    .from("students")
    .select(`${PUBLIC_SELECT}, father_name, qr_token, photo_path`)
    .eq("roll_no", rollNo)
    .eq("status", "active")
    .maybeSingle();
  if (!data) return null;
  const s = data as unknown as PublicStudent & { father_name: string | null; qr_token: string; photo_path: string | null };

  const [attendance, photos] = await Promise.all([getStudentAttendance(db, s.id), signPhotos(db, [s.photo_path])]);
  const photoUrl = s.photo_path ? (photos.get(s.photo_path) ?? null) : null;
  const card: CardStudent = {
    id: s.id,
    roll_no: s.roll_no,
    full_name: s.full_name,
    father_name: s.father_name,
    gender: s.gender,
    qr_token: s.qr_token,
    photoUrl,
    department: s.class.department.name,
    batch: s.class.batch.name,
    session: s.class.batch.session_label,
  };
  return { student: { id: s.id, roll_no: s.roll_no, full_name: s.full_name, gender: s.gender, class: s.class, photoUrl }, attendance, card };
}

/** Departments with their number of active students (for the department cards). */
async function getPublicDepartmentCardsRaw() {
  const db = createAdminClient();
  const [{ data: depts }, { data: classes }, { data: sizes }] = await Promise.all([
    db.from("departments").select("id, code, name").order("name"),
    db.from("classes").select("id, department_id"),
    db.from("class_summary").select("class_id, students"),
  ]);
  const size = new Map((sizes ?? []).map((s) => [s.class_id as string, Number(s.students)]));
  const count = new Map<string, number>();
  for (const c of classes ?? []) count.set(c.department_id, (count.get(c.department_id) ?? 0) + (size.get(c.id) ?? 0));
  return (depts ?? []).map((d) => ({ id: d.id as string, code: d.code as string, name: d.name as string, count: count.get(d.id) ?? 0 }));
}

async function getPublicDepartmentRaw(code: string) {
  const db = createAdminClient();
  const { data } = await db.from("departments").select("id, code, name").eq("code", code.toUpperCase()).maybeSingle();
  return data as { id: string; code: string; name: string } | null;
}

// ---------- Cached entry points -----------------------------------------
// Public pages are hit by many students at once (e.g. right after class), so
// results are cached briefly and invalidated immediately on any change.

export const PUBLIC_TAGS = { students: "public-students", attendance: "public-attendance" } as const;

/** Call after any change to students/classes/attendance so public pages update at once. */
export function invalidatePublic(...tags: (keyof typeof PUBLIC_TAGS)[]) {
  for (const t of tags.length ? tags : (Object.keys(PUBLIC_TAGS) as (keyof typeof PUBLIC_TAGS)[])) {
    revalidateTag(PUBLIC_TAGS[t], { expire: 0 });
  }
}

export const getPublicDepartments = unstable_cache(getPublicDepartmentsRaw, ["public-departments"], {
  revalidate: 600,
  tags: [PUBLIC_TAGS.students],
});
export const getPublicDepartment = unstable_cache(getPublicDepartmentRaw, ["public-department"], {
  revalidate: 600,
  tags: [PUBLIC_TAGS.students],
});
export const getPublicDepartmentCards = unstable_cache(getPublicDepartmentCardsRaw, ["public-department-cards"], {
  revalidate: 300,
  tags: [PUBLIC_TAGS.students],
});
export const searchStudents = unstable_cache(searchStudentsRaw, ["public-search"], {
  revalidate: 300,
  tags: [PUBLIC_TAGS.students],
});
/** Attendance changes during class (scans), so this one is kept only briefly. */
export const getPublicStudent = unstable_cache(getPublicStudentRaw, ["public-student"], {
  revalidate: 15,
  tags: [PUBLIC_TAGS.students, PUBLIC_TAGS.attendance],
});
