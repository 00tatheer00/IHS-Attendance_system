"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { studentEmail } from "@/config/institute";

export type FormState = { error?: string; ok?: boolean } | undefined;

const signInSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("student"), roll: z.string().trim().min(3, "Enter your roll number"), password: z.string().min(1, "Enter your password") }),
  z.object({ mode: z.literal("teacher"), email: z.string().trim().email("Enter a valid email"), password: z.string().min(1, "Enter your password") }),
]);

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const input = parsed.data;

  const supabase = await createClient();
  const email = input.mode === "student" ? studentEmail(input.roll) : input.email;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: input.password });
  if (error || !data.user) {
    return {
      error:
        input.mode === "student"
          ? "Roll number or password is incorrect. Your first password is the last 6 digits of your CNIC."
          : "Email or password is incorrect.",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, must_change_password")
    .eq("id", data.user.id)
    .single();

  if (!profile) {
    await supabase.auth.signOut();
    return { error: "This account has no profile. Ask your teacher to set it up." };
  }
  if (profile.role === "student") redirect(profile.must_change_password ? "/portal/password" : "/portal");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const passwordSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match", path: ["confirm"] });

export async function changePassword(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };
  await supabase.rpc("password_changed");
  return { ok: true };
}

// ---------- First-run setup ------------------------------------------

export async function hasAdmin() {
  const admin = createAdminClient();
  const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
  return (count ?? 0) > 0;
}

const setupSchema = z.object({
  full_name: z.string().trim().min(3, "Enter your full name"),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
});

/** Creates the first admin/teacher account. Disabled once an admin exists. */
export async function setupAdmin(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = setupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (await hasAdmin()) return { error: "Setup is already complete. Please sign in." };

  const { full_name, email, password } = parsed.data;
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) return { error: error?.message ?? "Could not create the account." };

  const uid = data.user.id;
  const p = await admin.from("profiles").insert({ id: uid, role: "admin", full_name });
  const t = await admin.from("teachers").insert({ user_id: uid, full_name, email });
  if (p.error || t.error) {
    await admin.auth.admin.deleteUser(uid);
    return { error: (p.error ?? t.error)!.message };
  }

  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email, password });
  redirect("/dashboard");
}
