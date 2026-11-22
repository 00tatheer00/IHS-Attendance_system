"use client";
import { useActionState, useState } from "react";
import { GraduationCapIcon, Loader2Icon, PresentationIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

type Mode = "student" | "teacher";

export function LoginForm() {
  const [mode, setMode] = useState<Mode>("student");
  const [state, action, pending] = useActionState(signIn, undefined);

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="tablist" aria-label="I am a">
        {(
          [
            ["student", "Student", GraduationCapIcon],
            ["teacher", "Teacher", PresentationIcon],
          ] as const
        ).map(([m, label, Icon]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              "flex h-9 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors",
              mode === m ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      <form action={action} className="space-y-4">
        <input type="hidden" name="mode" value={mode} />
        {mode === "student" ? (
          <div className="space-y-1.5">
            <Label htmlFor="roll">Roll number</Label>
            <Input
              id="roll"
              name="roll"
              placeholder="CAR-F26-01"
              autoCapitalize="characters"
              autoComplete="username"
              className="h-11 uppercase placeholder:normal-case"
              required
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="username" className="h-11" required />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" className="h-11" required />
          {mode === "student" && (
            <p className="text-xs text-muted-foreground">First time? Use the last 6 digits of your CNIC.</p>
          )}
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
    </div>
  );
}
