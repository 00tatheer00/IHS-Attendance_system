import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";

export default async function Home() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) redirect("/setup");
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  redirect(viewer.profile.role === "student" ? "/portal" : "/dashboard");
}
