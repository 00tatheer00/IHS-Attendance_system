"use client";
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRoundIcon, Loader2Icon, MoreHorizontalIcon, ShuffleIcon, UserMinusIcon, UserPlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTeacher, removeTeacherAccess, resetTeacherPassword } from "@/features/teachers/actions";

/** Readable random password, e.g. "ihs-7kq4-m2xp" */
function generatePassword() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const pick = (n: number) => Array.from(crypto.getRandomValues(new Uint32Array(n)), (v) => chars[v % chars.length]).join("");
  return `ihs-${pick(4)}-${pick(4)}`;
}

function PasswordField({ value, onChange, id = "password" }: { value: string; onChange: (v: string) => void; id?: string }) {
  return (
    <div className="flex gap-2">
      <Input id={id} name="password" value={value} onChange={(e) => onChange(e.target.value)} minLength={8} className="h-11 font-mono" required />
      <Button type="button" variant="outline" className="h-11" onClick={() => onChange(generatePassword())} title="Generate a password">
        <ShuffleIcon />
      </Button>
    </div>
  );
}

export function AddTeacherDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof createTeacher>>, fd: FormData) => {
    const res = await createTeacher(prev, fd);
    if (res?.ok) {
      toast.success("Teacher added", { description: res.ok, duration: 8000 });
      setOpen(false);
      router.refresh();
    } else if (res?.error) toast.error(res.error);
    return res;
  }, undefined);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setPassword(generatePassword());
      }}
    >
      <DialogTrigger render={<Button />}>
        <UserPlusIcon /> Add teacher
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a teacher</DialogTitle>
          <DialogDescription>They sign in with this email and password. Share the password with them privately.</DialogDescription>
        </DialogHeader>
        <form id="add-teacher" action={action} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" name="full_name" className="h-11" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="off" className="h-11" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <PasswordField value={password} onChange={setPassword} />
          </div>
        </form>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(password);
              toast.success("Password copied");
            }}
          >
            Copy password
          </Button>
          <Button type="submit" form="add-teacher" disabled={pending}>
            {pending ? <Loader2Icon className="animate-spin" /> : <UserPlusIcon />}
            Create account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TeacherActions({ teacherId, name }: { teacherId: string; name: string }) {
  const router = useRouter();
  const [resetOpen, setResetOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [pending, start] = useTransition();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`Manage ${name}`} />}>
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={() => {
              setPassword(generatePassword());
              setResetOpen(true);
            }}
          >
            <KeyRoundIcon /> Reset password
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setRemoveOpen(true)}>
            <UserMinusIcon /> Remove access
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New password for {name}</DialogTitle>
            <DialogDescription>Share it with them privately. They can sign in with it immediately.</DialogDescription>
          </DialogHeader>
          <PasswordField id="new-password" value={password} onChange={setPassword} />
          <DialogFooter>
            <Button
              disabled={pending || password.length < 8}
              onClick={() =>
                start(async () => {
                  const r = await resetTeacherPassword(teacherId, password);
                  if (r.error) return void toast.error(r.error);
                  await navigator.clipboard.writeText(password).catch(() => {});
                  toast.success("Password changed", { description: "The new password was copied to your clipboard." });
                  setResetOpen(false);
                })
              }
            >
              {pending && <Loader2Icon className="animate-spin" />}
              Save password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {name}’s access?</DialogTitle>
            <DialogDescription>
              They won’t be able to sign in any more. Their courses and all attendance records are kept — reassign the courses to another teacher.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await removeTeacherAccess(teacherId);
                  if (r.error) return void toast.error(r.error);
                  toast.success(`${name} can no longer sign in`);
                  setRemoveOpen(false);
                  router.refresh();
                })
              }
            >
              {pending && <Loader2Icon className="animate-spin" />}
              Remove access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
