import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** Current user + profile, memoised per request. */
export const getViewer = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, must_change_password")
    .eq("id", userId)
    .single<Profile>();
  if (!profile) return null;
  return { userId, profile, supabase };
});

export async function requireStaff() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.profile.role === "student") redirect("/portal");
  return viewer;
}

export async function requireStudent() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.profile.role !== "student") redirect("/dashboard");
  return viewer;
}

/** For server actions: throws instead of redirecting. */
export async function assertStaff() {
  const viewer = await getViewer();
  if (!viewer || viewer.profile.role === "student") throw new Error("Not allowed");
  return viewer;
}
