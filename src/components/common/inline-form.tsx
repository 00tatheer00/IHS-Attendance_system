"use client";
import { useActionState, useEffect, useRef } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type State = { error?: string; ok?: string } | undefined;

/** Small form bound to a server action; toasts the result and resets on success. */
export function InlineForm({
  action,
  submitLabel,
  children,
  className,
}: {
  action: (state: State, fd: FormData) => Promise<State>;
  submitLabel: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) {
      toast.success(state.ok);
      ref.current?.reset();
    } else if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form ref={ref} action={formAction} className={className ?? "flex flex-wrap items-end gap-2"}>
      {children}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending && <Loader2Icon className="animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  );
}
