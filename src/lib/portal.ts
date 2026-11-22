import "server-only";
import { redirect } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { STUDENT_SELECT } from "@/lib/students";
import type { StudentWithClass } from "@/lib/types";

/** Signed-in student with their record; forces the first-login password change. */
export async function getPortalStudent() {
  const viewer = await requireStudent();
  if (viewer.profile.must_change_password) redirect("/portal/password");
  const { data } = await viewer.supabase.from("students").select(STUDENT_SELECT).eq("user_id", viewer.userId).maybeSingle();
  if (!data) redirect("/login");
  return { ...viewer, student: data as unknown as StudentWithClass };
}

/** Classes a student must attend in a row to reach `min`%. */
export function classesNeeded(present: number, counted: number, min: number) {
  const r = min / 100;
  if (counted === 0 || present / counted >= r) return 0;
  return Math.ceil((r * counted - present) / (1 - r));
}

/** Classes a student can still miss and stay at/above `min`%. */
export function canMiss(present: number, counted: number, min: number) {
  const r = min / 100;
  if (counted === 0) return 0;
  return Math.max(0, Math.floor(present / r - counted));
}
