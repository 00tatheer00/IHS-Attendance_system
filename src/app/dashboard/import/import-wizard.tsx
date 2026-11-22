"use client";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  FileSpreadsheetIcon,
  FileTextIcon,
  Loader2Icon,
  ScanTextIcon,
  SearchIcon,
  UploadCloudIcon,
  XCircleIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { NativeSelect } from "@/components/common/native-select";
import { LinkButton } from "@/components/common/link-button";
import { StatCard } from "@/components/common/stat-card";
import { commitImport, parseSpreadsheet } from "@/features/import/actions";
import { findGaps, normalizeRows, validateRows, type RawRow, type ReviewRow } from "@/features/import/normalize";
import type { Gender } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  batches: { id: string; name: string; session_label: string | null }[];
  departments: { code: string; name: string }[];
  existing: { roll_no: string; full_name: string; father_name: string | null }[];
}

type Step = "choose" | "reading" | "review" | "saving" | "done";
type Filter = "attention" | "all" | "skipped";

export function ImportWizard({ batches, departments, existing }: Props) {
  const [step, setStep] = useState<Step>("choose");
  const [batchId, setBatchId] = useState(batches[0]?.id ?? "");
  const [fixCaps, setFixCaps] = useState(true);
  const [progress, setProgress] = useState<{ done: number; pages: number; ocr: boolean } | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [usedOcr, setUsedOcr] = useState(false);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<{ created: number; updated: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateOpts = useMemo(
    () => ({
      knownDepartments: departments.map((d) => d.code),
      existing: new Map(existing.map((e) => [e.roll_no, e])),
    }),
    [departments, existing],
  );

  async function handleFile(file: File) {
    setError(null);
    setFileName(file.name);
    setStep("reading");
    try {
      let raw: RawRow[];
      let ocr = false;
      if (/\.pdf$/i.test(file.name)) {
        const { readPdf } = await import("@/features/import/ocr/pdf-import");
        const res = await readPdf(file, setProgress);
        raw = res.rows;
        ocr = res.usedOcr;
      } else {
        const fd = new FormData();
        fd.set("file", file);
        const res = await parseSpreadsheet(fd);
        if (res.error) throw new Error(res.error);
        raw = res.rows!;
      }
      const normalized = normalizeRows(raw, { ...validateOpts, fixCapitalisation: fixCaps, ocr });
      if (!normalized.length) throw new Error("No roll numbers were found in this file.");
      setUsedOcr(ocr);
      setRows(normalized);
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read the file.");
      setStep("choose");
    }
  }

  const updateRow = useCallback(
    (key: string, patch: Partial<ReviewRow>) => {
      setRows((prev) => {
        const next = prev.map((r) => (r.key === key ? { ...r, ...patch, gender_guessed: "gender" in patch ? false : r.gender_guessed } : r));
        // re-validate on copies so memoised rows only re-render when their content changes
        const copies = next.map((r) => ({ ...r, issues: [...r.issues], warnings: [...r.warnings] }));
        validateRows(copies, validateOpts);
        return copies.map((c, i) => (sameRow(c, next[i]!, prev[i]) ? prev[i]! : c));
      });
    },
    [validateOpts],
  );

  async function handleCommit() {
    const ready = rows.filter((r) => r.include);
    if (ready.some((r) => r.issues.length)) {
      toast.error("Fix the rows marked in red first, or untick them.");
      return;
    }
    setStep("saving");
    const res = await commitImport({
      batchId,
      rows: ready.map((r) => ({
        roll_no: r.roll_no,
        department_code: r.department_code,
        full_name: r.full_name,
        father_name: r.father_name,
        gender: r.gender,
        cnic: r.cnic,
        phone: r.phone,
        remarks: r.remarks,
      })),
    });
    if (res.error) {
      toast.error(res.error);
      setStep("review");
      return;
    }
    setResult(res);
    setStep("done");
  }

  if (step === "choose" || step === "reading") {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <DropZone disabled={step === "reading" || !batchId} onFile={handleFile} reading={step === "reading"} progress={progress} fileName={fileName} />
        <div className="space-y-5 surface rounded-2xl p-5">
          <div className="space-y-1.5">
            <Label htmlFor="batch">Batch</Label>
            <NativeSelect id="batch" value={batchId} onChange={(e) => setBatchId(e.target.value)} disabled={step === "reading"}>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                  {b.session_label ? ` (${b.session_label})` : ""}
                </option>
              ))}
            </NativeSelect>
            <p className="text-xs text-muted-foreground">
              Students are placed in their department’s class for this batch, based on the roll-number prefix (CAR, DEN…).{" "}
              <Link href="/dashboard/settings" className="text-brand underline-offset-2 hover:underline">
                Add a batch
              </Link>
            </p>
          </div>
          <label className="flex items-start gap-2.5 text-sm">
            <Checkbox checked={fixCaps} onCheckedChange={(v) => setFixCaps(Boolean(v))} className="mt-0.5" />
            <span>
              Fix capitalisation
              <span className="block text-xs text-muted-foreground">“SHAH FAISAL” → “Shah Faisal”</span>
            </span>
          </label>
          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="border-t pt-4 text-xs text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">Expected columns</p>
            Roll No · Name · Father Name (optional: CNIC, Gender, Phone). Section headings and empty seats are skipped automatically.
          </div>
        </div>
      </div>
    );
  }

  if (step === "done" && result) {
    return (
      <div className="mx-auto max-w-lg surface rounded-2xl p-8 text-center">
        <CheckCircle2Icon className="mx-auto size-12 text-success" />
        <h2 className="mt-3 text-lg font-semibold">Import complete</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {result.created} new student{result.created === 1 ? "" : "s"} added
          {result.updated ? `, ${result.updated} updated` : ""}. QR codes were generated automatically.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <LinkButton href="/dashboard/courses">Set up courses</LinkButton>
          <LinkButton variant="outline" href="/dashboard/id-cards">
            Print ID cards
          </LinkButton>
          <LinkButton variant="ghost" href="/dashboard/students">
            View students
          </LinkButton>
        </div>
      </div>
    );
  }

  return (
    <Review
      rows={rows}
      usedOcr={usedOcr}
      fileName={fileName}
      departments={departments}
      saving={step === "saving"}
      onUpdate={updateRow}
      onCommit={handleCommit}
      onCancel={() => {
        setRows([]);
        setStep("choose");
      }}
    />
  );
}

function sameRow(a: ReviewRow, b: ReviewRow, prev?: ReviewRow) {
  return (
    !!prev &&
    prev === b &&
    a.issues.join() === b.issues.join() &&
    a.warnings.join() === b.warnings.join()
  );
}

// ---------------------------------------------------------------------

function DropZone({
  onFile,
  disabled,
  reading,
  progress,
  fileName,
}: {
  onFile: (f: File) => void;
  disabled: boolean;
  reading: boolean;
  progress: { done: number; pages: number; ocr: boolean } | null;
  fileName: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  if (reading) {
    const pct = progress?.pages ? Math.round((progress.done / progress.pages) * 100) : 0;
    return (
      <div className="flex min-h-72 flex-col items-center justify-center surface rounded-2xl p-8 text-center">
        {progress?.ocr ? <ScanTextIcon className="size-10 text-brand" /> : <Loader2Icon className="size-10 animate-spin text-brand" />}
        <p className="mt-4 font-medium">{progress?.ocr ? "Reading scanned pages…" : "Reading file…"}</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {progress?.ocr
            ? "This PDF is a scan, so each page is being read with text recognition. It takes about 5–10 seconds per page."
            : fileName}
        </p>
        {progress?.pages ? (
          <div className="mt-5 w-full max-w-xs">
            <Progress value={pct} />
            <p className="tabular mt-2 text-xs text-muted-foreground">
              Page {progress.done} of {progress.pages}
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
      }}
      className={cn(
        "flex min-h-72 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed bg-card p-8 text-center transition-colors",
        over ? "border-brand bg-brand-soft" : "hover:border-brand/50 hover:bg-muted/40",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand">
        <UploadCloudIcon className="size-7" />
      </div>
      <p className="mt-4 font-medium">Drop a class list here, or click to choose</p>
      <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
          <FileSpreadsheetIcon className="size-3.5" /> Excel (.xlsx)
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
          <FileTextIcon className="size-3.5" /> CSV
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
          <ScanTextIcon className="size-3.5" /> PDF (incl. scanned)
        </span>
      </div>
      <input
        ref={input}
        type="file"
        accept=".xlsx,.csv,.pdf,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </button>
  );
}

// ---------------------------------------------------------------------

function Review({
  rows,
  usedOcr,
  fileName,
  departments,
  saving,
  onUpdate,
  onCommit,
  onCancel,
}: {
  rows: ReviewRow[];
  usedOcr: boolean;
  fileName: string;
  departments: { code: string; name: string }[];
  saving: boolean;
  onUpdate: (key: string, patch: Partial<ReviewRow>) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const included = rows.filter((r) => r.include);
  const withIssues = included.filter((r) => r.issues.length);
  const attention = included.filter((r) => r.issues.length || r.warnings.some((w) => !w.startsWith("Already exists")));
  const skipped = rows.filter((r) => !r.include);
  const gaps = useMemo(() => findGaps(rows), [rows]);

  const [filter, setFilter] = useState<Filter>(attention.length ? "attention" : "all");
  const [dept, setDept] = useState("");
  const [q, setQ] = useState("");

  const visible = rows.filter((r) => {
    if (filter === "attention" && !(r.include && (r.issues.length || r.warnings.some((w) => !w.startsWith("Already exists"))))) return false;
    if (filter === "skipped" && r.include) return false;
    if (filter === "all" && !r.include) return false;
    if (dept && r.department_code !== dept) return false;
    if (q) {
      const s = q.toLowerCase();
      if (!r.roll_no.toLowerCase().includes(s) && !r.full_name.toLowerCase().includes(s) && !r.father_name.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const counts = Object.groupBy(included, (r) => r.department_code);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Students found" value={included.length} hint={fileName} />
        <StatCard label="Ready" value={included.length - withIssues.length} tone="success" />
        <StatCard label="Need a look" value={attention.length} tone={attention.length ? "warning" : "default"} hint="Warnings or errors" />
        <StatCard label="Skipped" value={skipped.length} hint="Empty seats & duplicates" />
      </div>

      {usedOcr && (
        <div className="flex gap-3 rounded-xl border border-warning/50 bg-warning/10 p-4 text-sm">
          <ScanTextIcon className="mt-0.5 size-5 shrink-0 text-warning-foreground" />
          <div>
            <p className="font-medium">This PDF was a scan, so it was read with text recognition.</p>
            <p className="mt-0.5 text-muted-foreground">
              Roll numbers are checked automatically. Names can contain small spelling slips — skim them below and click any cell to correct it.
              {gaps.length > 0 && (
                <span className="mt-1 block text-destructive">
                  Missing from the sequence: {gaps.slice(0, 12).join(", ")}
                  {gaps.length > 12 ? ` and ${gaps.length - 12} more` : ""}.
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1 rounded-xl bg-muted p-1">
          {(
            [
              ["attention", `Needs a look (${attention.length})`],
              ["all", `All (${included.length})`],
              ["skipped", `Skipped (${skipped.length})`],
            ] as const
          ).map(([f, label]) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "h-8 rounded-lg px-3 text-sm font-medium",
                filter === f ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <NativeSelect value={dept} onChange={(e) => setDept(e.target.value)} className="w-44">
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.code} value={d.code}>
                {d.code} · {d.name} ({counts[d.code]?.length ?? 0})
              </option>
            ))}
          </NativeSelect>
          <div className="relative w-full lg:w-56">
            <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="pl-8" />
          </div>
        </div>
      </div>

      <div className="overflow-hidden surface rounded-2xl">
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="sticky top-0 z-10 bg-muted/95 text-left text-xs text-muted-foreground backdrop-blur">
              <tr>
                <th className="w-10 px-3 py-2.5"></th>
                <th className="px-2 py-2.5 font-medium">Roll no.</th>
                <th className="px-2 py-2.5 font-medium">Name</th>
                <th className="px-2 py-2.5 font-medium">Father name</th>
                <th className="px-2 py-2.5 font-medium">Gender</th>
                <th className="px-2 py-2.5 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <ReviewRowView key={r.key} row={r} onUpdate={onUpdate} />
              ))}
            </tbody>
          </table>
          {!visible.length && (
            <p className="p-10 text-center text-sm text-muted-foreground">
              {filter === "attention" ? "Nothing needs attention. 🎉" : "No rows match."}
            </p>
          )}
        </div>
      </div>

      <div className="sticky bottom-20 z-20 flex flex-col gap-3 surface rounded-2xl/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between lg:bottom-4">
        <p className="px-1 text-sm text-muted-foreground">
          {withIssues.length ? (
            <span className="text-destructive">{withIssues.length} row(s) must be fixed or unticked.</span>
          ) : (
            <>
              Ready to import <strong className="text-foreground">{included.length}</strong> students into{" "}
              {Object.keys(counts).length} classes.
            </>
          )}
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            Start over
          </Button>
          <Button onClick={onCommit} disabled={saving || !included.length || withIssues.length > 0}>
            {saving && <Loader2Icon className="animate-spin" />}
            Import {included.length} students
          </Button>
        </div>
      </div>
    </div>
  );
}

const ReviewRowView = memo(function ReviewRowView({
  row,
  onUpdate,
}: {
  row: ReviewRow;
  onUpdate: (key: string, patch: Partial<ReviewRow>) => void;
}) {
  const notes = [...row.issues.map((t) => ({ t, bad: true })), ...row.warnings.map((t) => ({ t, bad: false }))];
  return (
    <tr className={cn("border-t align-top", row.issues.length && "bg-destructive/5", !row.include && "opacity-55")}>
      <td className="px-3 py-2">
        <Checkbox checked={row.include} onCheckedChange={(v) => onUpdate(row.key, { include: Boolean(v) })} aria-label="Include" />
      </td>
      <td className="tabular px-2 py-2 font-mono text-xs leading-7 whitespace-nowrap">{row.roll_no}</td>
      <td className="px-1 py-1">
        <CellInput value={row.full_name} onCommit={(v) => onUpdate(row.key, { full_name: v })} />
      </td>
      <td className="px-1 py-1">
        <CellInput value={row.father_name} onCommit={(v) => onUpdate(row.key, { father_name: v })} />
      </td>
      <td className="px-2 py-1.5">
        <GenderToggle value={row.gender} guessed={row.gender_guessed} onChange={(g) => onUpdate(row.key, { gender: g })} />
      </td>
      <td className="px-2 py-2 text-xs">
        <ul className="space-y-0.5">
          {notes.map(({ t, bad }) => (
            <li key={t} className={cn("flex items-start gap-1", bad ? "text-destructive" : "text-muted-foreground")}>
              {bad ? <XCircleIcon className="mt-px size-3.5 shrink-0" /> : <AlertTriangleIcon className="mt-px size-3.5 shrink-0 text-warning-foreground" />}
              {t}
            </li>
          ))}
        </ul>
      </td>
    </tr>
  );
});

/** Borderless input that commits on blur/Enter (keeps typing smooth on large tables). */
function CellInput({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  return (
    <input
      key={value}
      defaultValue={value}
      onBlur={(e) => e.target.value.trim() !== value && onCommit(e.target.value.trim())}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className="h-8 w-full min-w-40 rounded-md border border-transparent bg-transparent px-2 hover:border-input focus:border-ring focus:bg-background focus:outline-none"
    />
  );
}

function GenderToggle({ value, guessed, onChange }: { value: Gender | null; guessed: boolean; onChange: (g: Gender) => void }) {
  return (
    <div className="inline-flex rounded-lg bg-muted p-0.5 text-xs" title={guessed ? "Guessed from the name — click to change" : undefined}>
      {(["male", "female"] as const).map((g) => (
        <button
          key={g}
          type="button"
          onClick={() => onChange(g)}
          className={cn(
            "h-7 rounded-md px-2 font-medium",
            value === g ? cn("bg-card shadow-sm", guessed ? "text-muted-foreground italic" : "text-foreground") : "text-muted-foreground/70",
          )}
        >
          {g === "male" ? "M" : "F"}
        </button>
      ))}
    </div>
  );
}
