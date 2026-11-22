"use client";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword } from "@/features/auth/actions";

export function PasswordForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(changePassword, undefined);
  useEffect(() => {
    if (state?.ok) {
      toast.success("Password changed.");
      router.replace("/portal");
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-4 surface rounded-2xl p-5">
      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} className="h-11" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" className="h-11" required />
      </div>
      {state?.error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="h-11 w-full" disabled={pending}>
        {pending && <Loader2Icon className="animate-spin" />}
        Save password
      </Button>
    </form>
  );
}
