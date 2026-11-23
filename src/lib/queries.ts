import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CLASS_SELECT, OFFERING_SELECT, type ClassRow, type Offering } from "@/lib/types";

/**
 * Fetches every row of a query, 1000 at a time (Supabase caps a single
 * response at 1000 rows by default).
 */
export async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

export async function getClasses(supabase: SupabaseClient) {
  const { data } = await supabase.from("classes").select(CLASS_SELECT);
  const rows = (data ?? []) as unknown as ClassRow[];
  return rows.sort(
    (a, b) =>
      Number(a.department.is_locked) - Number(b.department.is_locked) ||
      a.department.name.localeCompare(b.department.name) ||
      (a.section ?? "").localeCompare(b.section ?? "") ||
      a.batch.name.localeCompare(b.batch.name),
  );
}

/**
 * Classes the viewer works with: all for the admin, otherwise only the classes
 * of the teacher's own courses.
 */
export async function getMyClasses(supabase: SupabaseClient, isAdmin: boolean) {
  const classes = await getClasses(supabase);
  if (isAdmin) return classes;
  const { data } = await supabase.from("course_offerings").select("class_id");
  const mine = new Set((data ?? []).map((o) => o.class_id as string));
  return classes.filter((c) => mine.has(c.id));
}

export async function getClassSizes(supabase: SupabaseClient) {
  const { data } = await supabase.from("class_summary").select("class_id, students");
  return new Map((data ?? []).map((r) => [r.class_id as string, Number(r.students)]));
}

/** Offerings the viewer can manage (RLS: admin sees all, teachers see their own). */
export async function getOfferings(supabase: SupabaseClient, opts: { activeOnly?: boolean } = {}) {
  let q = supabase.from("course_offerings").select(OFFERING_SELECT).order("created_at");
  if (opts.activeOnly) q = q.eq("is_active", true);
  const { data } = await q;
  const rows = (data ?? []) as unknown as Offering[];
  return rows.sort(
    (a, b) =>
      a.subject.code.localeCompare(b.subject.code) ||
      a.class.department.name.localeCompare(b.class.department.name) ||
      (a.class.section ?? "").localeCompare(b.class.section ?? "") ||
      a.class.batch.name.localeCompare(b.class.batch.name),
  );
}

export async function getOfferingSummaries(supabase: SupabaseClient) {
  const { data } = await supabase.from("offering_summary").select("offering_id, students, sessions, last_session");
  return new Map(
    (data ?? []).map((r) => [
      r.offering_id as string,
      { students: Number(r.students), sessions: Number(r.sessions), last_session: r.last_session as string | null },
    ]),
  );
}

/** Signed URLs for private student photos, keyed by storage path. */
export async function signPhotos(supabase: SupabaseClient, paths: (string | null)[], expiresIn = 3600) {
  const list = [...new Set(paths.filter((p): p is string => !!p))];
  if (!list.length) return new Map<string, string>();
  const { data } = await supabase.storage.from("student-photos").createSignedUrls(list, expiresIn);
  return new Map((data ?? []).filter((d) => d.signedUrl).map((d) => [d.path!, d.signedUrl]));
}

/** Department ids a teacher works in (via their courses). null = admin (all departments). */
export async function getMyDepartmentIds(supabase: SupabaseClient, isAdmin: boolean): Promise<Set<string> | null> {
  if (isAdmin) return null;
  const { data } = await supabase.from("course_offerings").select("class:classes(department_id)");
  return new Set(((data ?? []) as unknown as { class: { department_id: string } | null }[]).map((o) => o.class?.department_id).filter((d): d is string => !!d));
}
