/** Verifies merging A/B back into one class for single-section departments (PGlite). */
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
const last = files.find((f) => f.includes("single_section"))!;
for (const f of files.filter((f) => f !== last)) await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
// state after the sections split: EME-A, EME-B and DEN-A, DEN-B, each with an ICT course
await db.exec(`
  insert into public.teachers (full_name) values ('T');
  insert into public.classes (department_id, batch_id, section) select d.id, b.id, s from public.departments d, public.batches b, unnest(array['A','B']) s where d.code in ('EME','DEN');
  insert into public.students (roll_no, full_name, class_id)
    select r, r, (select c.id from public.classes c join public.departments d on d.id=c.department_id where d.code=split_part(r,'-',1) and c.section=public.section_for_roll(r))
    from unnest(array['EME-F26-01','EME-F26-70','DEN-F26-01','DEN-F26-70']) r;
  insert into public.course_offerings (subject_id, class_id, teacher_id) select s.id, c.id, t.id from public.subjects s, public.classes c, public.teachers t;`);
await db.exec(readFileSync(`supabase/migrations/${last}`, "utf8"));
const cls = (await db.query<{ code: string; section: string | null; n: number }>(`
  select d.code, c.section, (select count(*)::int from public.students s where s.class_id=c.id) n
  from public.classes c join public.departments d on d.id=c.department_id order by 1, 2 nulls first`)).rows;
assert.deepEqual(cls.map((c) => `${c.code}:${c.section ?? "-"}:${c.n}`), ["DEN:A:1", "DEN:B:1", "EME:-:2"]);
const eme = (await db.query<{ n: number; courses: number }>(`
  select (select count(*)::int from public.enrollments e join public.course_offerings o on o.id=e.offering_id join public.classes c on c.id=o.class_id join public.departments d on d.id=c.department_id where d.code='EME') n,
         (select count(*)::int from public.course_offerings o join public.classes c on c.id=o.class_id join public.departments d on d.id=c.department_id where d.code='EME') courses`)).rows[0]!;
assert.deepEqual([eme.courses, eme.n], [1, 2]);
console.log("✓ EME merged into one class + one course with both students; DEN keeps A/B");
