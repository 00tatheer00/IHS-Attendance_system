"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/common/native-select";
import { createOfferings } from "@/features/courses/actions";

interface Props {
  subjects: { id: string; code: string; name: string }[];
  classes: { id: string; label: string; batch: string; size: number }[];
  existing: { subject_id: string; class_id: string; term_label: string }[];
}

export function NewCourses({ subjects, classes, existing }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [term, setTerm] = useState("Semester 1");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  const taken = useMemo(
    () => new Set(existing.filter((e) => e.subject_id === subjectId && e.term_label === term.trim()).map((e) => e.class_id)),
    [existing, subjectId, term],
  );
  const byBatch = Object.groupBy(classes, (c) => c.batch);

  function toggle(id: string, on: boolean) {
    setPicked((p) => {
      const n = new Set(p);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
  }

  function submit() {
    start(async () => {
      const res = await createOfferings({ subject_id: subjectId, term_label: term, class_ids: [...picked].filter((id) => !taken.has(id)) });
      if (res.error) return void toast.error(res.error);
      toast.success(`${res.created} course${res.created === 1 ? "" : "s"} created. Students were enrolled automatically.`);
      setOpen(false);
      setPicked(new Set());
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />} disabled={!classes.length || !subjects.length}>
        <PlusIcon /> Add courses
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add courses</DialogTitle>
          <DialogDescription>Pick a subject and the classes you teach it to.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-[1fr_140px] gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="subject">Subject</Label>
            <NativeSelect id="subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="term">Term</Label>
            <Input id="term" value={term} onChange={(e) => setTerm(e.target.value)} />
          </div>
        </div>
        <div className="max-h-72 space-y-4 overflow-auto rounded-lg border p-3">
          {Object.entries(byBatch).map(([batch, list]) => (
            <div key={batch}>
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">{batch}</div>
              <div className="space-y-1">
                {list!.map((c) => {
                  const already = taken.has(c.id);
                  return (
                    <label key={c.id} className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 text-sm hover:bg-muted">
                      <Checkbox checked={already || picked.has(c.id)} disabled={already} onCheckedChange={(v) => toggle(c.id, Boolean(v))} />
                      <span className="flex-1">{c.label}</span>
                      <span className="text-xs text-muted-foreground">{already ? "added" : `${c.size} students`}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={pending || ![...picked].some((id) => !taken.has(id))}>
            {pending && <Loader2Icon className="animate-spin" />}
            Create {[...picked].filter((id) => !taken.has(id)).length || ""} course(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
