import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { PageHeader } from "@/components/common/page-header";
import { InlineForm } from "@/components/common/inline-form";
import { Input } from "@/components/ui/input";
import { addBatch, addDepartment, addSubject } from "@/features/settings/actions";
import { INSTITUTE, MIN_ATTENDANCE_PCT } from "@/config/institute";

export const metadata: Metadata = { title: "Settings" };

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b px-5 py-4">
        <h2 className="font-medium">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

function Chips({ items }: { items: { key: string; label: React.ReactNode }[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((i) => (
        <span key={i.key} className="rounded-lg bg-muted px-2.5 py-1 text-sm">
          {i.label}
        </span>
      ))}
    </div>
  );
}

export default async function SettingsPage() {
  const { supabase } = await requireStaff();
  const [{ data: depts }, { data: batches }, { data: subjects }] = await Promise.all([
    supabase.from("departments").select("id, code, name").order("code"),
    supabase.from("batches").select("id, name, intake_code, session_label").order("created_at"),
    supabase.from("subjects").select("id, code, name").order("code"),
  ]);

  return (
    <>
      <PageHeader title="Settings" description="Departments, batches and subjects used across the system." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Departments" description="The code must match the roll-number prefix (CAR-F26-01 → CAR).">
          <Chips items={(depts ?? []).map((d) => ({ key: d.id, label: <><b className="font-mono text-xs">{d.code}</b> {d.name}</> }))} />
          <InlineForm action={addDepartment} submitLabel="Add">
            <Input name="code" placeholder="Code" className="w-24 uppercase" required />
            <Input name="name" placeholder="Name, e.g. Physiotherapy" className="min-w-48 flex-1" required />
          </InlineForm>
        </Section>

        <Section title="Batches" description="An intake of students (e.g. Batch 3, Fall 2026).">
          <Chips
            items={(batches ?? []).map((b) => ({
              key: b.id,
              label: (
                <>
                  {b.name}
                  <span className="text-muted-foreground">{[b.intake_code, b.session_label].filter(Boolean).map((x) => ` · ${x}`)}</span>
                </>
              ),
            }))}
          />
          <InlineForm action={addBatch} submitLabel="Add">
            <Input name="name" placeholder="Batch 4" className="w-28" required />
            <Input name="intake_code" placeholder="F27" className="w-20 uppercase" />
            <Input name="session_label" placeholder="2027–2031" className="w-32" />
          </InlineForm>
        </Section>

        <Section title="Subjects" description="Subjects you can attach to classes on the Courses page.">
          <Chips items={(subjects ?? []).map((s) => ({ key: s.id, label: <><b className="font-mono text-xs">{s.code}</b> {s.name}</> }))} />
          <InlineForm action={addSubject} submitLabel="Add">
            <Input name="code" placeholder="Code" className="w-24 uppercase" required />
            <Input name="name" placeholder="Name" className="min-w-48 flex-1" required />
          </InlineForm>
        </Section>

        <Section title="Institute" description="Shown on ID cards and reports. Edit in src/config/institute.ts.">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">Name</dt>
            <dd>{INSTITUTE.name}</dd>
            <dt className="text-muted-foreground">Affiliation</dt>
            <dd>{INSTITUTE.affiliation}</dd>
            <dt className="text-muted-foreground">Address</dt>
            <dd>{INSTITUTE.address}</dd>
            <dt className="text-muted-foreground">Minimum attendance</dt>
            <dd>{MIN_ATTENDANCE_PCT}%</dd>
          </dl>
        </Section>
      </div>
    </>
  );
}
