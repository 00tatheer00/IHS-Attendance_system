"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertStaff } from "@/lib/auth";

export type ActionState = { error?: string; ok?: string } | undefined;

const deptSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z]{2,5}$/, "Code must be 2–5 letters (as used in roll numbers)"),
  name: z.string().trim().min(2, "Enter a name"),
});
const batchSchema = z.object({
  name: z.string().trim().min(2, "Enter a name, e.g. Batch 4"),
  intake_code: z.string().trim().toUpperCase().max(5).optional(),
  session_label: z.string().trim().max(20).optional(),
});
const subjectSchema = z.object({
  code: z.string().trim().toUpperCase().min(2, "Enter a short code"),
  name: z.string().trim().min(2, "Enter a name"),
});

async function insert(table: string, schema: z.ZodTypeAny, formData: FormData, label: string): Promise<ActionState> {
  const { supabase } = await assertStaff();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { error } = await supabase.from(table).insert(parsed.data as Record<string, unknown>);
  if (error) return { error: error.code === "23505" ? `That ${label} already exists.` : error.message };
  revalidatePath("/dashboard", "layout");
  return { ok: `${label[0]!.toUpperCase()}${label.slice(1)} added.` };
}

export async function addDepartment(_: ActionState, fd: FormData) {
  return insert("departments", deptSchema, fd, "department");
}
export async function addBatch(_: ActionState, fd: FormData) {
  return insert("batches", batchSchema, fd, "batch");
}
export async function addSubject(_: ActionState, fd: FormData) {
  return insert("subjects", subjectSchema, fd, "subject");
}
