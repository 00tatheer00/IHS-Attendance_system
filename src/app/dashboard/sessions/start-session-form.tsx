"use client";
import { useActionState, useEffect, useState } from "react";
import { Loader2Icon, ScanLineIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/common/native-select";
import { startSession } from "@/features/sessions/actions";
import { readLocal, useBrowserValue } from "@/lib/use-browser";

const LAST_KEY = "ihs:last-course";

export function StartSessionForm({ offerings, defaultId }: { offerings: { id: string; label: string }[]; defaultId?: string }) {
  const [state, action, pending] = useActionState(startSession, undefined);
  // Remember the last course used on this device (teachers usually repeat).
  const last = useBrowserValue(() => readLocal(LAST_KEY), null);
  const remembered = last && offerings.some((o) => o.id === last) ? last : null;
  const [picked, setCourse] = useState<string | null>(null);
  const course = picked ?? defaultId ?? remembered ?? offerings[0]?.id ?? "";

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form
      action={action}
      onSubmit={() => {
        try { localStorage.setItem(LAST_KEY, course); } catch {}
      }}
      className="rounded-3xl border bg-card p-5 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25">
          <ScanLineIcon className="size-5" />
        </div>
        <div>
          <h2 className="font-medium">Start a class</h2>
          <p className="text-sm text-muted-foreground">Opens the scanner. Students show their ID card to the camera.</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="offering_id">Course</Label>
          <NativeSelect id="offering_id" name="offering_id" value={course} onChange={(e) => setCourse(e.target.value)}>
            {offerings.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="topic">
            Topic <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input id="topic" name="topic" placeholder="e.g. Introduction to MS Excel" />
        </div>
        <Button type="submit" className="h-11 bg-linear-to-r from-emerald-500 to-teal-600 px-5 shadow-emerald-600/25 hover:from-emerald-600 hover:to-teal-700" disabled={pending || !course}>
          {pending ? <Loader2Icon className="animate-spin" /> : <ScanLineIcon />}
          Start scanning
        </Button>
      </div>
    </form>
  );
}
