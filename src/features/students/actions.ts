"use server";
import { invalidatePublic } from "@/lib/public";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { initialPasswordFromCnic, sectionForRoll, studentEmail } from "@/config/institute";
import { ensureClasses, mirrorCourses } from "@/lib/class-placement";

export type ActionState = { error?: string; ok?: string } | undefined;

const editSchema = z.object({
  full_name: z.string().trim().min(2, "Enter the full name").max(120),
  father_name: z.string().trim().max(120).optional(),
  gender: z.enum(["male", "female", ""]).optional(),
  cnic: z
    .string()
    .trim()
    .transform((v) => {
      const d = v.replace(/\D/g, "");
      return d.length === 13 ? `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}` : v;
    })
    .refine((v) => v === "" || /^\d{5}-\d{7}-\d$/.test(v), "CNIC must have 13 digits"),
  phone: z.string().trim().max(30).optional(),
  status: z.enum(["active", "inactive", "graduated"]),
  remarks: z.string().trim().max(200).optional(),
});

export async function updateStudent(id: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await assertStaff();
  const parsed = editSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const v = parsed.data;
  const { error } = await supabase
    .from("students")
    .update({
      full_name: v.full_name,
      father_name: v.father_name || null,
      gender: v.gender || null,
      cnic: v.cnic || null,
      phone: v.phone || null,
      status: v.status,
      remarks: v.remarks || null,
    })
    .eq("id", id);
  if (error) return { error: error.code === "23514" ? "Check the CNIC format." : error.message };
  revalidatePath("/dashboard", "layout");
  invalidatePublic();
  return { ok: "Saved." };
}

export async function setStudentPhoto(id: string, path: string | null) {
  const { supabase } = await assertStaff();
  const { data: prev } = await supabase.from("students").select("photo_path").eq("id", id).single();
  const { error } = await supabase.from("students").update({ photo_path: path }).eq("id", id);
  if (error) return { error: error.message };
  if (prev?.photo_path && prev.photo_path !== path) await supabase.storage.from("student-photos").remove([prev.photo_path]);
  revalidatePath("/dashboard", "layout");
  invalidatePublic();
  return {};
}

/** Issue a new QR code (e.g. lost card). The old card stops working immediately. */
export async function regenerateQr(id: string) {
  const { supabase } = await assertStaff();
  const { error } = await supabase.from("students").update({ qr_token: randomBytes(8).toString("hex") }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
  invalidatePublic();
  return {};
}

// ---------- Student portal accounts ----------------------------------

export interface AccountResult {
  created: number;
  skippedNoCnic: number;
  failed: { roll_no: string; reason: string }[];
}

/**
 * Creates portal logins for students who have a CNIC but no account yet.
 * Login = roll number; first password = last 6 digits of CNIC (must be changed).
 */
export async function createPortalAccounts(studentIds?: string[]): Promise<AccountResult & { error?: string }> {
  const { supabase } = await assertStaff(); // authorisation check via RLS-bound client
  const admin = createAdminClient();

  let q = supabase.from("students").select("id, roll_no, full_name, cnic").is("user_id", null).eq("status", "active");
  if (studentIds?.length) q = q.in("id", studentIds);
  const { data: students, error } = await q.range(0, 4999);
  if (error) return { created: 0, skippedNoCnic: 0, failed: [], error: error.message };

  const result: AccountResult = { created: 0, skippedNoCnic: 0, failed: [] };
  for (const s of students ?? []) {
    const password = s.cnic ? initialPasswordFromCnic(s.cnic) : null;
    if (!password) { result.skippedNoCnic++; continue; }

    const email = studentEmail(s.roll_no);
    let uid: string | undefined;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { roll_no: s.roll_no } });
    if (created.error) {
      // Account may already exist from an earlier partial run → reuse it.
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      uid = list?.users.find((u) => u.email === email)?.id;
      if (!uid) { result.failed.push({ roll_no: s.roll_no, reason: created.error.message }); continue; }
      await admin.auth.admin.updateUserById(uid, { password });
    } else uid = created.data.user.id;

    const p = await admin.from("profiles").upsert({ id: uid, role: "student", full_name: s.full_name, must_change_password: true });
    const l = await admin.from("students").update({ user_id: uid }).eq("id", s.id);
    if (p.error || l.error) result.failed.push({ roll_no: s.roll_no, reason: (p.error ?? l.error)!.message });
    else result.created++;
  }
  revalidatePath("/dashboard", "layout");
  invalidatePublic();
  return result;
}

/** Resets a student's password back to the CNIC rule and forces a change on next login. */
export async function resetPortalPassword(studentId: string): Promise<{ error?: string; ok?: string }> {
  const { supabase } = await assertStaff();
  const { data: s } = await supabase.from("students").select("user_id, cnic, roll_no").eq("id", studentId).single();
  if (!s?.user_id) return { error: "This student has no portal account yet." };
  const password = s.cnic ? initialPasswordFromCnic(s.cnic) : null;
  if (!password) return { error: "Add the student's CNIC first." };
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(s.user_id, { password });
  if (error) return { error: error.message };
  await admin.from("profiles").update({ must_change_password: true }).eq("id", s.user_id);
  return { ok: `Password reset. ${s.roll_no} can sign in with the last 6 digits of their CNIC.` };
}

// ---------- Deleting ---------------------------------------------------

/** Removes photos and portal logins that belonged to deleted students. */
async function cleanupStudentFiles(rows: { user_id: string | null; photo_path: string | null }[]) {
  const admin = createAdminClient();
  const photos = rows.map((r) => r.photo_path).filter((p): p is string => !!p);
  for (let i = 0; i < photos.length; i += 100) await admin.storage.from("student-photos").remove(photos.slice(i, i + 100));
  // Deleting the auth user also deletes the profile (on delete cascade).
  for (const r of rows) if (r.user_id) await admin.auth.admin.deleteUser(r.user_id);
}

/** Permanently deletes one student with their attendance, photo and portal login. */
export async function deleteStudent(id: string): Promise<{ error?: string }> {
  const { supabase } = await assertStaff();
  const { data: s, error: readErr } = await supabase.from("students").select("user_id, photo_path").eq("id", id).maybeSingle();
  if (readErr) return { error: readErr.message };
  if (!s) return { error: "Student not found." };
  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) return { error: error.message };
  await cleanupStudentFiles([s]);
  revalidatePath("/dashboard", "layout");
  invalidatePublic();
  return {};
}

/**
 * Permanently deletes a class: its courses (with their classes held and
 * attendance), every student in it (with photos and portal logins), then the
 * class itself.
 */
export async function deleteClass(classId: string): Promise<{ error?: string; students?: number }> {
  const { supabase, profile } = await assertStaff();
  // Admin only: a teacher can't see other teachers' courses, so a partial delete would be possible.
  if (profile.role !== "admin") return { error: "Only an administrator can delete a whole class." };

  const students: { user_id: string | null; photo_path: string | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("students").select("user_id, photo_path").eq("class_id", classId).range(from, from + 999);
    if (error) return { error: error.message };
    students.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }

  const off = await supabase.from("course_offerings").delete().eq("class_id", classId);
  if (off.error) return { error: `Could not delete the class’s courses: ${off.error.message}` };
  const st = await supabase.from("students").delete().eq("class_id", classId);
  if (st.error) return { error: st.error.message };
  const cl = await supabase.from("classes").delete().eq("id", classId);
  if (cl.error) return { error: cl.error.message };

  await cleanupStudentFiles(students);
  revalidatePath("/dashboard", "layout");
  invalidatePublic();
  return { students: students.length };
}

// ---------- Adding a single student --------------------------------------

const newStudentSchema = z.object({
  roll_no: z.string().trim().toUpperCase().regex(/^[A-Z]{2,5}-[A-Z]\d{2}-\d{1,4}$/, "Roll number looks like CAR-F26-01"),
  full_name: z.string().trim().min(2, "Enter the full name").max(120),
  father_name: z.string().trim().max(120).optional(),
  gender: z.enum(["male", "female", ""]).optional(),
  cnic: z
    .string()
    .trim()
    .transform((v) => {
      const d = v.replace(/\D/g, "");
      return d.length === 13 ? `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}` : v;
    })
    .refine((v) => v === "" || /^\d{5}-\d{7}-\d$/.test(v), "CNIC must have 13 digits"),
  phone: z.string().trim().max(30).optional(),
  batch_id: z.string().uuid("Choose a batch"),
  section: z.enum(["auto", "A", "B"]).default("auto"),
});

export type NewStudentState = { error?: string; ok?: string; id?: string } | undefined;

/** Adds one student. Department comes from the roll prefix; section from the roll number (1–50 → A) unless chosen. */
export async function createStudent(_: NewStudentState, fd: FormData): Promise<NewStudentState> {
  const { supabase } = await assertStaff();
  const parsed = newStudentSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const v = parsed.data;
  const roll = v.roll_no.replace(/-(\d)$/, "-0$1"); // CAR-F26-1 → CAR-F26-01

  const code = roll.split("-")[0]!;
  const { data: dept } = await supabase.from("departments").select("id, name, is_locked").eq("code", code).maybeSingle();
  if (!dept) return { error: `No department with code “${code}”. Add it in Settings first.` };
  if (dept.is_locked) return { error: `${dept.name} is locked. Unlock it in Settings first.` };

  const section = v.section === "auto" ? sectionForRoll(roll) : v.section;
  const placement = await ensureClasses(supabase, v.batch_id, [{ departmentId: dept.id, section }]);
  const classId = placement.classIdOf(dept.id, section);
  if (placement.error || !classId) return { error: placement.error ?? "Could not find the class." };
  await mirrorCourses(supabase, v.batch_id, [dept.id]);

  const { data, error } = await supabase
    .from("students")
    .insert({
      roll_no: roll,
      full_name: v.full_name,
      father_name: v.father_name || null,
      gender: v.gender || null,
      cnic: v.cnic || null,
      phone: v.phone || null,
      class_id: classId,
    })
    .select("id")
    .single();
  if (error) return { error: error.code === "23505" ? `${roll} already exists.` : error.message };

  revalidatePath("/dashboard", "layout");
  invalidatePublic();
  return { ok: `${v.full_name} added to ${dept.name} Section ${section}.`, id: data.id };
}
