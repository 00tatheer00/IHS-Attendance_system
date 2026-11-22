import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { BrandMark } from "@/components/brand/brand";
import { INSTITUTE } from "@/config/institute";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) redirect("/setup");
  const viewer = await getViewer();
  if (viewer) redirect(viewer.profile.role === "student" ? "/portal" : "/dashboard");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark size={72} className="mb-4" />
          <h1 className="text-xl font-semibold tracking-tight">{INSTITUTE.name}</h1>
          <p className="text-sm text-muted-foreground">Attendance &amp; Student Portal</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
