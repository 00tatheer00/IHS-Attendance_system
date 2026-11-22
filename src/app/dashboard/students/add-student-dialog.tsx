"use client";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, Loader2Icon, LockIcon, UserPlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/common/native-select";
import { createStudent } from "@/features/students/actions";
import { sectionForRoll } from "@/config/institute";
import { deptTheme } from "@/lib/dept-theme";
import { cn } from "@/lib/utils";

interface Props {
  batches: { id: string; name: string; session_label: string | null }[];
  departments: { code: string; name: string; is_locked: boolean }[];
}

export function AddStudentDialog({ batches, departments }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [roll, setRoll] = useState("");
  const [section, setSection] = useState<"auto" | "A" | "B">("auto");
  const [, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof createStudent>>, fd: FormData) => {
    const res = await createStudent(prev, fd);
    if (res?.ok) {
      toast.success("Student added", { description: res.ok });
      setOpen(false);
      setRoll("");
      setSection("auto");
      if (res.id) router.push(`/dashboard/students/${res.id}`);
    } else if (res?.error) toast.error(res.error);
    return res;
  }, undefined);

  // Live preview of where the student will go
  const clean = roll.trim().toUpperCase();
  const code = clean.match(/^([A-Z]{2,5})-/)?.[1];
  const dept = departments.find((d) => d.code === code);
  const validRoll = /^[A-Z]{2,5}-[A-Z]\d{2}-\d{1,4}$/.test(clean);
  const sec = section === "auto" ? (validRoll ? sectionForRoll(clean) : null) : section;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <UserPlusIcon /> Add student
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a student</DialogTitle>
          <DialogDescription>Department comes from the roll number prefix. Roll 1–50 → Section A, 51+ → Section B.</DialogDescription>
        </DialogHeader>
        <form id="add-student" action={action} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="roll_no">Roll number *</Label>
            <Input
              id="roll_no"
              name="roll_no"
              value={roll}
              onChange={(e) => setRoll(e.target.value)}
              placeholder="DEN-F26-104"
              autoCapitalize="characters"
              className="h-11 font-mono uppercase placeholder:font-sans placeholder:normal-case"
              required
            />
            <div className="min-h-6 text-xs">
              {clean && !dept && code && <span className="text-destructive">No department with code “{code}”.</span>}
              {dept?.is_locked && (
                <span className="inline-flex items-center gap-1 text-destructive">
                  <LockIcon className="size-3" /> {dept.name} is locked — unlock it in Settings first.
                </span>
              )}
              {dept && !dept.is_locked && (
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <ArrowRightIcon className="size-3" />
                  <span className={cn("rounded-md px-1.5 py-0.5 font-semibold", deptTheme(dept.code).soft)}>
                    BS {dept.name}
                    {sec ? ` · Section ${sec}` : ""}
                  </span>
                </span>
              )}
            </div>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="full_name">Full name *</Label>
            <Input id="full_name" name="full_name" className="h-11" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="father_name">Father name</Label>
            <Input id="father_name" name="father_name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gender">Gender</Label>
            <NativeSelect id="gender" name="gender" defaultValue="">
              <option value="">Not set</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cnic">CNIC / B-Form</Label>
            <Input id="cnic" name="cnic" inputMode="numeric" placeholder="17301-1234567-1" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" inputMode="tel" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="batch_id">Batch</Label>
            <NativeSelect id="batch_id" name="batch_id" defaultValue={batches[0]?.id}>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                  {b.session_label ? ` (${b.session_label})` : ""}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="section">Section</Label>
            <NativeSelect id="section" name="section" value={section} onChange={(e) => setSection(e.target.value as "auto" | "A" | "B")}>
              <option value="auto">Automatic (by roll number)</option>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
            </NativeSelect>
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" form="add-student" disabled={pending || !!dept?.is_locked} className="h-10">
            {pending ? <Loader2Icon className="animate-spin" /> : <UserPlusIcon />}
            Add student
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
