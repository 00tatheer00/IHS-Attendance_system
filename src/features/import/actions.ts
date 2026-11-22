"use server";
import { invalidatePublic } from "@/lib/public";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertStaff } from "@/lib/auth";
import type { RawRow } from "./normalize";
import { readSpreadsheet } from "./spreadsheet";
import { ensureClasses, mirrorCourses } from "@/lib/class-placement";
import { sectionForRoll } from "@/config/institute";

export async function parseSpreadsheet(formData: FormData): Promise<{ rows?: RawRow[]; error?: string }> {
  await assertStaff();
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No file received." };
  if (!/\.(xlsx|csv)$/i.test(file.name)) return { error: "Use an .xlsx or .csv file. (Old .xls files: open in Excel and Save As .xlsx.)" };
  try {
    const rows = await readSpreadsheet(file);
    if (!rows.length) return { error: "No student rows found. The sheet needs a header row with “Roll No” and “Name” columns." };
    return { rows };
  } catch {
    return { error: "Could not read this file. Is it a valid Excel workbook?" };
  }
}

const rowSchema = z.object({
  roll_no: z.string().regex(/^[A-Z]{2,5}-[A-Z]\d{2}-\d{2,4}$/),
  department_code: z.string(),
  full_name: z.string().trim().min(1).max(120),
  father_name: z.string().trim().max(120),
  gender: z.enum(["male", "female"]).nullable(),
  cnic: z.union([z.literal(""), z.string().regex(/^\d{5}-\d{7}-\d$/)]),
  phone: z.string().trim().max(30),
  remarks: z.string().trim().max(200),
});

const commitSchema = z.object({
  batchId: z.string().uuid(),
  rows: z.array(rowSchema).min(1).max(5000),
});

export type CommitResult = { created: number; updated: number; error?: string };

export async function commitImport(input: z.infer<typeof commitSchema>): Promise<CommitResult> {
  const { supabase } = await assertStaff();
  const parsed = commitSchema.safeParse(input);
  if (!parsed.success) return { created: 0, updated: 0, error: "Some rows are invalid. Fix the highlighted rows and try again." };
  const { batchId, rows } = parsed.data;

  // Departments → ensure a class exists for every (department, batch)
  const { data: depts, error: dErr } = await supabase.from("departments").select("id, code, is_locked");
  if (dErr) return { created: 0, updated: 0, error: dErr.message };
  const deptId = new Map(depts!.map((d) => [d.code as string, d.id as string]));
  const codes = [...new Set(rows.map((r) => r.department_code))];
  const unknown = codes.filter((c) => !deptId.has(c));
  if (unknown.length) return { created: 0, updated: 0, error: `Unknown department code(s): ${unknown.join(", ")}` };
  const locked = depts!.filter((d) => d.is_locked && codes.includes(d.code)).map((d) => d.code);
  if (locked.length) return { created: 0, updated: 0, error: `Locked department(s): ${locked.join(", ")}. Unlock in Settings first.` };

  // Place each student in their department's section class (roll 1–50 → A, 51+ → B)
  const placement = await ensureClasses(
    supabase,
    batchId,
    rows.map((r) => ({ departmentId: deptId.get(r.department_code)!, section: sectionForRoll(r.roll_no) })),
  );
  if (placement.error) return { created: 0, updated: 0, error: placement.error };

  // Merge with existing rows so blanks in the file never erase saved data
  const ex = new Map<string, { gender: string | null; cnic: string | null; phone: string | null; remarks: string | null }>();
  for (let i = 0; i < rows.length; i += 200) {
    const { data: existing, error } = await supabase
      .from("students")
      .select("roll_no, gender, cnic, phone, remarks")
      .in("roll_no", rows.slice(i, i + 200).map((r) => r.roll_no));
    if (error) return { created: 0, updated: 0, error: error.message };
    for (const s of existing ?? []) ex.set(s.roll_no, s);
  }

  const payload = rows.map((r) => {
    const prev = ex.get(r.roll_no);
    return {
      roll_no: r.roll_no,
      full_name: r.full_name,
      father_name: r.father_name || null,
      class_id: placement.classIdOf(deptId.get(r.department_code)!, sectionForRoll(r.roll_no))!,
      gender: r.gender ?? prev?.gender ?? null,
      cnic: r.cnic || prev?.cnic || null,
      phone: r.phone || prev?.phone || null,
      remarks: r.remarks || prev?.remarks || null,
    };
  });

  for (let i = 0; i < payload.length; i += 500) {
    const { error } = await supabase.from("students").upsert(payload.slice(i, i + 500), { onConflict: "roll_no" });
    if (error) return { created: 0, updated: 0, error: error.message };
  }

  // A brand-new section gets the same courses as its department's other section
  await mirrorCourses(supabase, batchId, codes.map((c) => deptId.get(c)!));

  revalidatePath("/dashboard", "layout");
  invalidatePublic();
  return { created: payload.length - ex.size, updated: ex.size };
}
