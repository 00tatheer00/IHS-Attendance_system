"use client";
import { useActionState } from "react";
import Link from "next/link";
import { ArrowRightIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/features/auth/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, undefined);

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4 surface rounded-2xl p-5 shadow-sm">
        <input type="hidden" name="mode" value="teacher" />
        <div className="space-y-1.5">
          <Label htmlFor="email">Teacher email</Label>
          <Input id="email" name="email" type="email" autoComplete="username" className="h-11" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" className="h-11" required />
        </div>
        {state?.error && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        )}
        <Button type="submit" className="h-11 w-full text-sm" disabled={pending}>
          {pending && <Loader2Icon className="animate-spin" />}
          Sign in
        </Button>
      </form>

      <Link
        href="/"
        className="flex items-center justify-between surface rounded-2xl px-5 py-4 text-sm transition-colors hover:bg-muted/50"
      >
        <span>
          <span className="block font-medium">Student?</span>
          <span className="text-muted-foreground">Check your attendance and download your ID card — no login needed.</span>
        </span>
        <ArrowRightIcon className="size-4 shrink-0 text-brand" />
      </Link>
    </div>
  );
}
