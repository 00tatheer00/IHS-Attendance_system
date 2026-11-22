import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { BrandMark } from "@/components/brand/brand";
import { hasAdmin } from "@/features/auth/actions";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "First-time setup" };

export default async function SetupPage() {
  await connection(); // always evaluate at request time
  const configured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (configured && (await hasAdmin())) redirect("/login");

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <BrandMark size={48} />
          <div>
            <h1 className="text-lg font-semibold">First-time setup</h1>
            <p className="text-sm text-muted-foreground">Create the administrator (teacher) account.</p>
          </div>
        </div>
        {configured ? (
          <SetupForm />
        ) : (
          <div className="surface rounded-2xl p-5 text-sm">
            <p className="font-medium">Supabase is not connected yet.</p>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-muted-foreground">
              <li>Copy <code>.env.example</code> to <code>.env.local</code>.</li>
              <li>Fill in the URL, anon key and service-role key from Supabase → Project Settings → API.</li>
              <li>Run the SQL in <code>supabase/migrations</code> (see README).</li>
              <li>Restart the dev server and reload this page.</li>
            </ol>
          </div>
        )}
      </div>
    </main>
  );
}
