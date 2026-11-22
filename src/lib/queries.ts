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
      a.batch.name.localeCompare(b.batch.name) ||
      a.department.code.localeCompare(b.department.code) ||
      (a.section ?? "").localeCompare(b.section ?? ""),
  );
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
      a.class.batch.name.localeCompare(b.class.batch.name) ||
      a.class.department.code.localeCompare(b.class.department.code),
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
