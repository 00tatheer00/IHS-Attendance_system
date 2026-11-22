"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteClass } from "@/features/students/actions";

/** Deletes a whole class. The user must type the department code to confirm. */
export function DeleteClassButton({ classId, label, code, students }: { classId: string; label: string; code: string; students: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, start] = useTransition();
  const ok = typed.trim().toUpperCase() === code;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setTyped("");
      }}
    >
      <DialogTrigger render={<Button variant="destructive" />}>
        <Trash2Icon /> Delete class
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {label}?</DialogTitle>
          <DialogDescription>
            This permanently deletes the class, its <b>{students} student{students === 1 ? "" : "s"}</b>, their portal logins and photos, and all of
            the class’s courses and attendance records. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="confirm-code">
            Type <span className="font-mono font-semibold">{code}</span> to confirm
          </Label>
          <Input id="confirm-code" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className="uppercase" />
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={!ok || pending}
            onClick={() =>
              start(async () => {
                const r = await deleteClass(classId);
                if (r.error) return void toast.error(r.error);
                toast.success(`${label} deleted (${r.students} students).`);
                setOpen(false);
                router.replace("/dashboard/students");
                router.refresh();
              })
            }
          >
            {pending && <Loader2Icon className="animate-spin" />}
            Delete class permanently
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
