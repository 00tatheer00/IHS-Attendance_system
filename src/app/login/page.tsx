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
    <main className="page-enter flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="bg-hero relative mb-5 flex flex-col items-center overflow-hidden rounded-[28px] px-6 pt-8 pb-7 text-center text-white shadow-2xl shadow-indigo-950/25">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.04)_1px,transparent_1px)] bg-size-[22px_22px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />
          <BrandMark size={72} className="relative mb-4 rounded-2xl p-1 shadow-xl ring-4 ring-white/15" />
          <h1 className="relative text-xl font-bold tracking-tight">{INSTITUTE.name}</h1>
          <p className="relative text-sm text-indigo-100/80">Teacher sign in</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
