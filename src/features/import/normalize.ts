/**
 * Turns raw table rows (from Excel, CSV or OCR) into clean, validated rows for
 * the review screen. Pure and shared by client and server.
 */
import { titleCase } from "@/lib/format";
import type { Gender } from "@/lib/types";
import { guessGender } from "./gender";
import { correctOcrName, snapDepartment } from "./ocr/correct";

export interface RawRow {
  roll: string;
  name: string;
  father?: string;
  cnic?: string;
  gender?: string;
  phone?: string;
  source?: string; // e.g. "Page 3" or "Sheet1 row 12"
}

export interface ReviewRow {
  key: string;
  roll_no: string;
  department_code: string;
  full_name: string;
  father_name: string;
  gender: Gender | null;
  gender_guessed: boolean;
  cnic: string;
  phone: string;
  remarks: string;
  source: string;
  include: boolean;
  issues: string[];
  warnings: string[];
}

/** Matches IHS roll numbers like CAR-F26-01, tolerating OCR noise around them. */
const ROLL_RE = /([A-Z]{2,5})\s*-?\s*([FS])\s*([0-9OIL]{2})\s*-?\s*([0-9OIL]{1,4})/;

const fixDigits = (s: string) => s.replace(/O/g, "0").replace(/[IL]/g, "1");

/** Finds a roll number in `input`; `rest` is any text after it (OCR often glues the next word on). */
export function extractRoll(input: string): { roll: string | null; rest: string } {
  const m = input.toUpperCase().replace(/[–—_]/g, "-").match(ROLL_RE); // same length as input
  if (!m) return { roll: null, rest: input };
  const [, dept, term, year, num] = m;
  const n = fixDigits(num!).replace(/^0+(?=\d{2})/, "");
  return {
    roll: `${dept}-${term}${fixDigits(year!)}-${n.padStart(2, "0")}`,
    rest: input.slice(m.index! + m[0].length),
  };
}

export function normalizeRoll(input: string): string | null {
  return extractRoll(input).roll;
}

/** Strip OCR debris (table rules read as | [ ] etc.) and tidy spacing. */
export function cleanText(s: string | undefined | null) {
  return (s ?? "")
    .replace(/[|[\]{}~`“”‘’"_=<>®©°¢]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s.,;:'\-]+|[\s,;:'\-]+$/g, "")
    .trim();
}

export function normalizeCnic(s: string | undefined) {
  const d = (s ?? "").replace(/\D/g, "");
  return d.length === 13 ? `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}` : (s ?? "").trim();
}

function parseGender(s: string | undefined): Gender | null {
  const v = (s ?? "").trim().toLowerCase();
  if (["m", "male", "boy"].includes(v)) return "male";
  if (["f", "female", "girl"].includes(v)) return "female";
  return null;
}

const nameKey = (name: string, father: string) =>
  `${name}|${father}`.toLowerCase().replace(/[^a-z|]/g, "");

export interface NormalizeOptions {
  knownDepartments: string[];
  /** roll_no → existing student (for "will update" and duplicate detection) */
  existing: Map<string, { full_name: string; father_name: string | null }>;
  fixCapitalisation: boolean;
  /** Apply OCR spelling corrections (image PDFs only). */
  ocr?: boolean;
}

export function normalizeRows(raw: RawRow[], opts: NormalizeOptions): ReviewRow[] {
  const rows: ReviewRow[] = [];
  const seenRoll = new Map<string, ReviewRow>();

  raw.forEach((r, i) => {
    let roll = normalizeRoll(r.roll);
    if (!roll) return; // not a student row (headers, section titles, blank lines)
    const [code, ...restRoll] = roll.split("-");
    roll = [snapDepartment(code!, opts.knownDepartments), ...restRoll].join("-");

    let name = cleanText(r.name);
    let father = cleanText(r.father);
    let remarks = "";
    // "Saif Ullah (Shifted RAD)" → father "Saif Ullah", remarks "Shifted RAD"
    const paren = father.match(/^(.*?)\s*\((.+)\)\s*$/);
    if (paren) { father = paren[1]!.trim(); remarks = paren[2]!.trim(); }
    if (opts.fixCapitalisation) { name = titleCase(name); father = titleCase(father); }
    if (opts.ocr) { name = correctOcrName(name); father = correctOcrName(father); }

    const explicit = parseGender(r.gender);
    const guessed = explicit ? null : guessGender(name);
    const dept = roll.split("-")[0]!;
    const cnic = normalizeCnic(r.cnic);

    const row: ReviewRow = {
      key: `${roll}-${i}`,
      roll_no: roll,
      department_code: dept,
      full_name: name,
      father_name: father,
      gender: explicit ?? guessed,
      gender_guessed: !explicit && guessed != null,
      cnic,
      phone: (r.phone ?? "").trim(),
      remarks,
      source: r.source ?? "",
      include: name.length > 0,
      issues: [],
      warnings: [],
    };
    if (!name) row.warnings.push("Empty seat — no name (skipped)");
    rows.push(row);

    const prev = seenRoll.get(roll);
    if (prev) {
      row.include = false;
      row.warnings.push(`Duplicate roll number in file (kept the first one)`);
    } else seenRoll.set(roll, row);
  });

  validateRows(rows, opts);
  return rows;
}

/** (Re)computes issues and warnings. Call again after the user edits a row. */
export function validateRows(rows: ReviewRow[], opts: Pick<NormalizeOptions, "knownDepartments" | "existing">) {
  const known = new Set(opts.knownDepartments);
  const byPerson = new Map<string, ReviewRow[]>();
  for (const r of rows) {
    if (!r.include) continue;
    const k = nameKey(r.full_name, r.father_name);
    byPerson.set(k, [...(byPerson.get(k) ?? []), r]);
  }
  const existingByPerson = new Map<string, string>();
  for (const [roll, s] of opts.existing) existingByPerson.set(nameKey(s.full_name, s.father_name ?? ""), roll);

  for (const r of rows) {
    r.issues = [];
    r.warnings = r.warnings.filter((w) => w.startsWith("Empty seat") || w.startsWith("Duplicate roll"));
    if (!r.include) continue;

    if (!r.full_name) r.issues.push("Name is required");
    if (!known.has(r.department_code)) r.issues.push(`Unknown department code "${r.department_code}" — add it in Settings`);
    if (r.cnic && !/^\d{5}-\d{7}-\d$/.test(r.cnic)) r.issues.push("CNIC must have 13 digits");
    if (/[^A-Za-z .'\-]/.test(r.full_name)) r.warnings.push("Name has unusual characters — check spelling");
    if (r.gender == null) r.warnings.push("Gender unknown");

    const twins = byPerson.get(nameKey(r.full_name, r.father_name)) ?? [];
    const others = twins.filter((t) => t !== r).map((t) => t.roll_no);
    if (others.length && r.father_name) r.warnings.push(`Same student as ${others.join(", ")}? (department change)`);

    const ex = opts.existing.get(r.roll_no);
    if (ex) r.warnings.push("Already exists — will be updated");
    else {
      const exRoll = existingByPerson.get(nameKey(r.full_name, r.father_name));
      if (exRoll && r.father_name) r.warnings.push(`Same name & father as existing ${exRoll}`);
    }
  }
  return rows;
}

/** Roll numbers missing from a sequence (e.g. OCR skipped a line). */
export function findGaps(rows: ReviewRow[]) {
  const byPrefix = new Map<string, number[]>();
  for (const r of rows) {
    const m = r.roll_no.match(/^(.*-)(\d+)$/);
    if (!m) continue;
    byPrefix.set(m[1]!, [...(byPrefix.get(m[1]!) ?? []), Number(m[2])]);
  }
  const gaps: string[] = [];
  for (const [prefix, nums] of byPrefix) {
    const set = new Set(nums);
    const max = Math.max(...nums);
    for (let n = 1; n <= max; n++) if (!set.has(n)) gaps.push(`${prefix}${String(n).padStart(2, "0")}`);
  }
  return gaps;
}
