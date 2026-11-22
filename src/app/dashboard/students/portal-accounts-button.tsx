"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRoundIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createPortalAccounts } from "@/features/students/actions";

export function PortalAccountsButton({ eligible, missingCnic }: { eligible: string[]; missingCnic: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [done, setDone] = useState(0);

  function run() {
    start(async () => {
      let created = 0;
      const failed: string[] = [];
      setDone(0);
      // Small batches keep each server call well under hosting time limits.
      for (let i = 0; i < eligible.length; i += 25) {
        const res = await createPortalAccounts(eligible.slice(i, i + 25));
        if (res.error) return void toast.error(res.error);
        created += res.created;
        failed.push(...res.failed.map((f) => f.roll_no));
        setDone(Math.min(i + 25, eligible.length));
      }
      toast.success(`${created} portal account${created === 1 ? "" : "s"} created.`);
      if (failed.length) toast.error(`${failed.length} failed: ${failed.slice(0, 5).join(", ")}${failed.length > 5 ? "…" : ""}`);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <KeyRoundIcon /> Portal accounts
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Student portal accounts</DialogTitle>
          <DialogDescription>
            Students sign in with their <b>roll number</b>. Their first password is the <b>last 6 digits of their CNIC</b>, and they must change it after
            signing in.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-success/10 p-3">
            <div className="tabular text-2xl font-semibold text-success">{eligible.length}</div>
            ready to create
          </div>
          <div className="rounded-lg bg-muted p-3">
            <div className="tabular text-2xl font-semibold">{missingCnic}</div>
            missing CNIC
          </div>
        </div>
        {missingCnic > 0 && (
          <p className="text-xs text-muted-foreground">
            Add CNICs on each student’s page (or include a CNIC column when importing) to create the remaining accounts.
          </p>
        )}
        {pending && <Progress value={(done / Math.max(1, eligible.length)) * 100} />}
        <DialogFooter>
          <Button onClick={run} disabled={pending || !eligible.length}>
            {pending && <Loader2Icon className="animate-spin" />}
            Create {eligible.length} account{eligible.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
