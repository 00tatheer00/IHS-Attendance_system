import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Returns class ids for every (department, section) pair in a batch,
 * creating any class that doesn't exist yet. New sections are enrolled in
 * the department's courses automatically by the database.
 */
export async function ensureClasses(
  supabase: SupabaseClient,
  batchId: string,
  pairs: { departmentId: string; section: string | null }[],
): Promise<{ error?: string; classIdOf: (departmentId: string, section: string | null) => string | undefined }> {
  const unique = [...new Map(pairs.map((p) => [`${p.departmentId}:${p.section ?? ""}`, p])).values()];
  if (unique.length) {
    const { error } = await supabase.from("classes").upsert(
      unique.map((p) => ({ department_id: p.departmentId, batch_id: batchId, section: p.section })),
      { onConflict: "department_id,batch_id,section", ignoreDuplicates: true },
    );
    if (error) return { error: error.message, classIdOf: () => undefined };
  }
  const { data, error } = await supabase.from("classes").select("id, department_id, section").eq("batch_id", batchId);
  if (error) return { error: error.message, classIdOf: () => undefined };
  const map = new Map((data ?? []).map((c) => [`${c.department_id}:${c.section ?? ""}`, c.id as string]));
  return { classIdOf: (d, s) => map.get(`${d}:${s ?? ""}`) };
}

/**
 * New sections of a department should get the same courses as the department's
 * other sections (e.g. Dental A has ICT → Dental B gets ICT too).
 */
export async function mirrorCourses(supabase: SupabaseClient, batchId: string, departmentIds: string[]) {
  if (!departmentIds.length) return;
  const { data: classes } = await supabase.from("classes").select("id, department_id").eq("batch_id", batchId).in("department_id", departmentIds);
  const { data: offerings } = await supabase
    .from("course_offerings")
    .select("subject_id, teacher_id, term_label, class_id")
    .in("class_id", (classes ?? []).map((c) => c.id));
  const byDept = new Map<string, { subject_id: string; teacher_id: string; term_label: string }[]>();
  const deptOf = new Map((classes ?? []).map((c) => [c.id as string, c.department_id as string]));
  for (const o of offerings ?? []) {
    const d = deptOf.get(o.class_id)!;
    byDept.set(d, [...(byDept.get(d) ?? []), o]);
  }
  const rows = (classes ?? []).flatMap((c) =>
    (byDept.get(c.department_id) ?? []).map((o) => ({ subject_id: o.subject_id, teacher_id: o.teacher_id, term_label: o.term_label, class_id: c.id })),
  );
  if (rows.length) {
    await supabase.from("course_offerings").upsert(rows, { onConflict: "subject_id,class_id,term_label", ignoreDuplicates: true });
  }
}
