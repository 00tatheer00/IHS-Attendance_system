import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { fetchAll, getMyDepartmentIds } from "@/lib/queries";
import { PageHeader } from "@/components/common/page-header";
import { ImportWizard } from "./import-wizard";

export const metadata: Metadata = { title: "Import students" };

export default async function ImportPage() {
  const { supabase, profile } = await requireStaff();
  const myDepts = await getMyDepartmentIds(supabase, profile.role === "admin");
  const [{ data: batches }, { data: depts }, existing] = await Promise.all([
    supabase.from("batches").select("id, name, session_label").order("created_at", { ascending: false }),
    supabase.from("departments").select("id, code, name, is_locked").order("code"),
    fetchAll<{ roll_no: string; full_name: string; father_name: string | null }>((a, b) =>
      supabase.from("students").select("roll_no, full_name, father_name").order("roll_no").range(a, b),
    ),
  ]);

  return (
    <>
      <PageHeader
        title="Import students"
        description="Upload a class list (Excel, CSV or PDF). You’ll review every row before anything is saved."
      />
      <ImportWizard
        batches={batches ?? []}
        departments={(depts ?? []).map((d) => ({ code: d.code, name: d.name, is_locked: d.is_locked, mine: !myDepts || myDepts.has(d.id) }))}
        existing={existing}
      />
    </>
  );
}
