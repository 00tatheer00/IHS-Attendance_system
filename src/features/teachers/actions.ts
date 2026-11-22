"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export type TeacherState = { error?: string; ok?: string } | undefined;

async function assertAdmin() {
  const viewer = await assertStaff();
  if (viewer.profile.role !== "admin") throw new Error("Only an administrator can manage teachers.");
  return viewer;
}

const createSchema = z.object({
  full_name: z.string().trim().min(3, "Enter the teacher’s full name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password needs at least 8 characters"),
});

/** Creates a teacher login. They sign in at /login and see only their own courses. */
export async function createTeacher(_: TeacherState, fd: FormData): Promise<TeacherState> {
  await assertAdmin();
  const parsed = createSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { full_name, email, password } = parsed.data;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } });
  if (error || !data.user) {
    return { error: /already/i.test(error?.message ?? "") ? "A user with this email already exists." : (error?.message ?? "Could not create the account.") };
  }
  const uid = data.user.id;
  const p = await admin.from("profiles").insert({ id: uid, role: "teacher", full_name });
  const t = await admin.from("teachers").insert({ user_id: uid, full_name, email });
  if (p.error || t.error) {
    await admin.auth.admin.deleteUser(uid);
    return { error: (p.error ?? t.error)!.message };
  }
  revalidatePath("/dashboard", "layout");
  return { ok: `${full_name} can now sign in with ${email}.` };
}

export async function resetTeacherPassword(teacherId: string, password: string): Promise<{ error?: string }> {
  await assertAdmin();
  if (password.length < 8) return { error: "Password needs at least 8 characters." };
  const admin = createAdminClient();
  const { data: t } = await admin.from("teachers").select("user_id").eq("id", teacherId).single();
  if (!t?.user_id) return { error: "This teacher has no login." };
  const { error } = await admin.auth.admin.updateUserById(t.user_id, { password });
  return error ? { error: error.message } : {};
}

/** Removes the teacher's login. Their courses and attendance history stay. */
export async function removeTeacherAccess(teacherId: string): Promise<{ error?: string }> {
  const { userId } = await assertAdmin();
  const admin = createAdminClient();
  const { data: t } = await admin.from("teachers").select("user_id").eq("id", teacherId).single();
  if (!t?.user_id) return { error: "This teacher has no login." };
  if (t.user_id === userId) return { error: "You can’t remove your own access." };
  const { error } = await admin.auth.admin.deleteUser(t.user_id); // profile is removed with it
  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
  return {};
}

/** Gives a course to a teacher (only they — and the admin — can then take its attendance). */
export async function assignCourseTeacher(offeringId: string, teacherId: string): Promise<{ error?: string }> {
  const { supabase } = await assertAdmin();
  const { error } = await supabase.from("course_offerings").update({ teacher_id: teacherId }).eq("id", offeringId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
  return {};
}
