"use client";
import { useMemo, useRef, useState } from "react";
import { FileDownIcon, Loader2Icon, PrinterIcon, SearchIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { CARD_H, CARD_W, IdCardBack, IdCardFront, type CardStudent } from "@/components/id-card/id-card";
import { IdCardViewer } from "@/components/id-card/id-card-viewer";
import { printSheetPdf } from "@/components/id-card/export";
import { cn } from "@/lib/utils";

const THUMB = 0.5;

export function CardSheet({ students, title }: { students: CardStudent[]; title: string }) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(students.map((s) => s.id)));
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<CardStudent | null>(null);
  const [exporting, setExporting] = useState<CardStudent[] | null>(null);
  const [progress, setProgress] = useState(0);
  const refs = useRef(new Map<string, { front?: HTMLDivElement | null; back?: HTMLDivElement | null }>());

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? students.filter((x) => x.full_name.toLowerCase().includes(s) || x.roll_no.toLowerCase().includes(s)) : students;
  }, [q, students]);

  async function exportSheets() {
    const list = students.filter((s) => selected.has(s.id));
    if (!list.length) return;
    setProgress(0);
    setExporting(list); // mounts full-size cards off-screen
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    try {
      await printSheetPdf(
        list.map((s) => ({ front: refs.current.get(s.id)!.front!, back: refs.current.get(s.id)!.back! })),
        `${title.replace(/[^\w]+/g, "-")}-id-cards.pdf`,
        (d, t) => setProgress(Math.round((d / t) * 100)),
      );
      toast.success(`PDF ready — ${list.length} cards on ${Math.ceil(list.length / 9) * 2} pages.`);
    } catch {
      toast.error("Could not create the PDF.");
    } finally {
      setExporting(null);
    }
  }

  const allOn = selected.size === students.length;

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={allOn} onCheckedChange={(v) => setSelected(v ? new Set(students.map((s) => s.id)) : new Set())} />
            {selected.size} of {students.length} selected
          </label>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-56">
            <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a student" className="pl-8" />
          </div>
          <Button onClick={exportSheets} disabled={!selected.size || !!exporting}>
            {exporting ? <Loader2Icon className="animate-spin" /> : <PrinterIcon />}
            Print sheets (PDF)
          </Button>
        </div>
      </div>

      {exporting && (
        <div className="mb-4 rounded-xl border bg-card p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium">
              <FileDownIcon className="size-4 text-brand" /> Building PDF for {exporting.length} cards…
            </span>
            <span className="tabular text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4">
        {visible.map((s) => (
          <div key={s.id} className="group relative">
            <button
              type="button"
              onClick={() => setOpen(s)}
              className={cn(
                "block overflow-hidden rounded-[10px] transition-all",
                selected.has(s.id) ? "ring-2 ring-brand ring-offset-2" : "opacity-60 hover:opacity-100",
              )}
              style={{ width: CARD_W * THUMB, height: CARD_H * THUMB }}
            >
              <div style={{ transform: `scale(${THUMB})`, transformOrigin: "top left" }}>
                <IdCardFront s={s} />
              </div>
            </button>
            <div className="absolute top-2 left-2">
              <Checkbox
                checked={selected.has(s.id)}
                onCheckedChange={(v) =>
                  setSelected((p) => {
                    const n = new Set(p);
                    if (v) n.add(s.id);
                    else n.delete(s.id);
                    return n;
                  })
                }
                className="bg-white shadow"
                aria-label={`Select ${s.full_name}`}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Off-screen full-size cards used only while exporting */}
      {exporting && (
        <div aria-hidden className="pointer-events-none fixed top-0 -left-[20000px] flex gap-4">
          {exporting.map((s) => (
            <div key={s.id} className="flex gap-4">
              <IdCardFront s={s} ref={(el) => void refs.current.set(s.id, { ...refs.current.get(s.id), front: el })} />
              <IdCardBack s={s} ref={(el) => void refs.current.set(s.id, { ...refs.current.get(s.id), back: el })} />
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle className="sr-only">ID card of {open?.full_name}</DialogTitle>
          {open && <IdCardViewer student={open} scale={0.85} className="py-2" />}
        </DialogContent>
      </Dialog>
    </>
  );
}
