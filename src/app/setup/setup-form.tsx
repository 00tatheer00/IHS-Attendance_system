"use client";
import { useActionState } from "react";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setupAdmin } from "@/features/auth/actions";

export function SetupForm() {
  const [state, action, pending] = useActionState(setupAdmin, undefined);
  return (
    <form action={action} className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
      <div className="space-y-1.5">
        <Label htmlFor="full_name">Full name</Label>
        <Input id="full_name" name="full_name" placeholder="As it should appear on reports" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      {state?.error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="h-10 w-full" disabled={pending}>
        {pending && <Loader2Icon className="animate-spin" />}
        Create account
      </Button>
    </form>
  );
}
