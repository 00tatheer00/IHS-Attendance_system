"use client";
import { useMemo, useState } from "react";
import { EyeIcon, Loader2Icon, PrinterIcon, SearchIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { StudentAvatar } from "@/components/students/student-avatar";
import { IdCardViewer } from "@/components/id-card/id-card-viewer";
import { buildSheetPdf, type CardStudent } from "@/components/id-card/card-pdf";
import { downloadBlob, loadCardAssets } from "@/components/id-card/card-client";
import { cn } from "@/lib/utils";

export function CardSheet({ students, title }: { students: CardStudent[]; title: string }) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(students.map((s) => s.id)));
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<CardStudent | null>(null);
  const [exporting, setExporting] = useState(false);

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? students.filter((x) => x.full_name.toLowerCase().includes(s) || x.roll_no.toLowerCase().includes(s)) : students;
  }, [q, students]);

  async function exportSheets() {
    const list = students.filter((s) => selected.has(s.id));
    if (!list.length) return;
    setExporting(true);
    try {
      const doc = buildSheetPdf(list, await loadCardAssets(list));
      downloadBlob(doc.output("blob"), `${title.replace(/[^\w]+/g, "-")}-ID-cards.pdf`);
      toast.success(`PDF ready: ${list.length} cards on ${Math.ceil(list.length / 9) * 2} A4 pages. Print double-sided, flip on long edge.`);
    } catch (e) {
      console.error(e);
      toast.error("Could not create the PDF.");
    } finally {
      setExporting(false);
    }
  }

  const toggle = (id: string, on: boolean) =>
    setSelected((p) => {
      const n = new Set(p);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={selected.size === students.length}
            onCheckedChange={(v) => setSelected(v ? new Set(students.map((s) => s.id)) : new Set())}
          />
          {selected.size} of {students.length} selected
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-56">
            <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a student" className="pl-8" />
          </div>
          <Button onClick={exportSheets} disabled={!selected.size || exporting}>
            {exporting ? <Loader2Icon className="animate-spin" /> : <PrinterIcon />}
            Print sheets (PDF)
          </Button>
        </div>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((s) => (
          <li key={s.id} className={cn("flex items-center gap-3 rounded-xl border bg-card p-3 transition-opacity", !selected.has(s.id) && "opacity-60")}>
            <Checkbox checked={selected.has(s.id)} onCheckedChange={(v) => toggle(s.id, Boolean(v))} aria-label={`Select ${s.full_name}`} />
            <StudentAvatar photoUrl={s.photoUrl} gender={s.gender} name={s.full_name} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{s.full_name}</div>
              <div className="font-mono text-xs text-muted-foreground">{s.roll_no}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setOpen(s)}>
              <EyeIcon /> Card
            </Button>
          </li>
        ))}
      </ul>
      {!visible.length && <p className="p-10 text-center text-sm text-muted-foreground">No students match.</p>}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogTitle>{open?.full_name}</DialogTitle>
          {open && <IdCardViewer student={open} className="py-1" />}
        </DialogContent>
      </Dialog>
    </>
  );
}
