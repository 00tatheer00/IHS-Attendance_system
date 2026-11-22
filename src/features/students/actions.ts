"use server";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { initialPasswordFromCnic, studentEmail } from "@/config/institute";

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
  return { ok: "Saved." };
}

export async function setStudentPhoto(id: string, path: string | null) {
  const { supabase } = await assertStaff();
  const { data: prev } = await supabase.from("students").select("photo_path").eq("id", id).single();
  const { error } = await supabase.from("students").update({ photo_path: path }).eq("id", id);
  if (error) return { error: error.message };
  if (prev?.photo_path && prev.photo_path !== path) await supabase.storage.from("student-photos").remove([prev.photo_path]);
  revalidatePath("/dashboard", "layout");
  return {};
}

/** Issue a new QR code (e.g. lost card). The old card stops working immediately. */
export async function regenerateQr(id: string) {
  const { supabase } = await assertStaff();
  const { error } = await supabase.from("students").update({ qr_token: randomBytes(8).toString("hex") }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
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
