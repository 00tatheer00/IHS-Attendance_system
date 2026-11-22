import type { Metadata } from "next";
import { requireStudent } from "@/lib/auth";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Change password" };

export default async function PasswordPage() {
  const { profile } = await requireStudent();
  const first = profile.must_change_password;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{first ? "Choose your own password" : "Change password"}</h1>
        <p className="text-sm text-muted-foreground">
          {first
            ? "For your security, replace the CNIC-based password before continuing."
            : "Use at least 8 characters."}
        </p>
      </div>
      <PasswordForm />
    </div>
  );
}
