/** Verifies the sections migration on a copy of the data shape (PGlite). */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec(`create role anon nologin; create role authenticated nologin; create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
  create schema storage; create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  create function storage.foldername(name text) returns text[] language sql as $$ select array[]::text[] $$;
  create publication supabase_realtime;`);
const files = readdirSync("supabase/migrations").sort();
const sections = files.find((f) => f.includes("sections"))!;
for (const f of files.filter((f) => f !== sections)) await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
// existing data: one unsectioned class with 3 students and an ICT course
await db.exec(`
  insert into public.teachers (full_name) values ('T');
  insert into public.classes (department_id, batch_id) select d.id, b.id from public.departments d, public.batches b where d.code='DEN';
  insert into public.students (roll_no, full_name, class_id) select r, r, (select id from public.classes) from unnest(array['DEN-F26-01','DEN-F26-50','DEN-F26-51','DEN-F26-103']) r;
  insert into public.course_offerings (subject_id, class_id, teacher_id) select s.id, c.id, t.id from public.subjects s, public.classes c, public.teachers t;`);
await db.exec(readFileSync(`supabase/migrations/${sections}`, "utf8"));
const rows = (await db.query<{ roll_no: string; section: string }>(`select s.roll_no, c.section from public.students s join public.classes c on c.id = s.class_id order by s.roll_no`)).rows;
assert.deepEqual(rows.map((r) => `${r.roll_no}:${r.section}`), ["DEN-F26-01:A", "DEN-F26-103:B", "DEN-F26-50:A", "DEN-F26-51:B"]);
const off = (await db.query<{ section: string; n: number }>(`select c.section, count(e.*)::int n from public.course_offerings o join public.classes c on c.id=o.class_id left join public.enrollments e on e.offering_id=o.id group by c.section order by 1`)).rows;
assert.deepEqual(off, [{ section: "A", n: 2 }, { section: "B", n: 2 }]);
assert.equal((await db.query(`select 1 from public.classes where section is null`)).rows.length, 0);
console.log("✓ sections migration: students split 1–50 → A, 51+ → B; course split with enrollments");
