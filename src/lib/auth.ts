import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** `sub` (user id) from a JWT without a network call. */
function jwtSubject(token: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1]!, "base64url").toString("utf8"));
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/**
 * Current user + profile, memoised per request.
 *
 * Fast path: the user id is read from the session cookie (no round trip to
 * Supabase Auth). This is safe because the very next query — the profile —
 * is sent with that same access token, and the database verifies the token
 * signature and enforces RLS (`id = auth.uid()`); a forged or expired token
 * returns no profile, so the viewer is treated as signed out. The proxy
 * refreshes expiring tokens before pages render.
 */
export const getViewer = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  const userId = data.session ? jwtSubject(data.session.access_token) : null;
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
