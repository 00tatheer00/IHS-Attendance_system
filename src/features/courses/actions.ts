"use server";
import { invalidatePublic } from "@/lib/public";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertStaff } from "@/lib/auth";

const schema = z.object({
  subject_id: z.string().uuid("Choose a subject"),
  term_label: z.string().trim().min(1).max(40),
  class_ids: z.array(z.string().uuid()).min(1, "Choose at least one class"),
  teacher_id: z.string().uuid().optional(),
});

export async function createOfferings(input: z.infer<typeof schema>): Promise<{ error?: string; created?: number }> {
  const { supabase, userId, profile } = await assertStaff();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  // Admin can create courses for any teacher; a teacher only for themselves
  let teacherId = parsed.data.teacher_id;
  if (!teacherId || profile.role !== "admin") {
    const { data: me } = await supabase.from("teachers").select("id").eq("user_id", userId).single();
    if (!me) return { error: "Your account is not linked to a teacher profile." };
    teacherId = me.id as string;
  }

  const { subject_id, term_label, class_ids } = parsed.data;
  const { data, error } = await supabase
    .from("course_offerings")
    .upsert(
      class_ids.map((class_id) => ({ subject_id, class_id, term_label, teacher_id: teacherId })),
      { onConflict: "subject_id,class_id,term_label", ignoreDuplicates: true },
    )
    .select("id");
  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
  invalidatePublic();
  return { created: data?.length ?? 0 };
}

export async function setOfferingActive(id: string, active: boolean) {
  const { supabase } = await assertStaff();
  const { error } = await supabase.from("course_offerings").update({ is_active: active }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
  invalidatePublic();
  return {};
}
