"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { assertStaff } from "@/lib/auth";
import { todayPK } from "@/lib/format";

const startSchema = z.object({
  offering_id: z.string().uuid("Choose a course"),
  topic: z.string().trim().max(120).optional(),
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/** Start a class: creates an open session and goes straight to the scanner. */
export async function startSession(_: unknown, fd: FormData): Promise<{ error?: string }> {
  const { supabase } = await assertStaff();
  const parsed = startSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      offering_id: parsed.data.offering_id,
      topic: parsed.data.topic || null,
      session_date: parsed.data.session_date || todayPK(),
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
  redirect(`/scan/${data.id}`);
}

export async function closeSession(sessionId: string): Promise<{ error?: string; absent?: number }> {
  const { supabase } = await assertStaff();
  const { data, error } = await supabase.rpc("close_session", { p_session: sessionId });
  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
  return { absent: data as number };
}

export async function reopenSession(sessionId: string): Promise<{ error?: string }> {
  const { supabase } = await assertStaff();
  const { error } = await supabase.rpc("reopen_session", { p_session: sessionId });
  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function cancelSession(sessionId: string): Promise<{ error?: string }> {
  const { supabase } = await assertStaff();
  const { error } = await supabase.from("sessions").update({ status: "cancelled", closed_at: new Date().toISOString() }).eq("id", sessionId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
  return {};
}

export async function deleteSession(sessionId: string): Promise<{ error?: string }> {
  const { supabase } = await assertStaff();
  const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/sessions");
}

const statusSchema = z.object({
  session: z.string().uuid(),
  student: z.string().uuid(),
  status: z.enum(["present", "absent", "excused"]),
  note: z.string().trim().max(200).optional(),
});

export async function setAttendance(input: z.infer<typeof statusSchema>): Promise<{ error?: string }> {
  const { supabase } = await assertStaff();
  const p = statusSchema.safeParse(input);
  if (!p.success) return { error: "Invalid input." };
  const { error } = await supabase.rpc("set_attendance_status", {
    p_session: p.data.session,
    p_student: p.data.student,
    p_status: p.data.status,
    p_note: p.data.note || null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/sessions/${p.data.session}`);
  return {};
}
