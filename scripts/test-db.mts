/**
 * Runs the Supabase migration against an in-process Postgres (PGlite) with
 * minimal stubs for Supabase's auth/storage schemas, then exercises the
 * attendance flow and RLS. Usage: npx tsx scripts/test-db.mts
 */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";

const db = new PGlite();

await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.uid', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql as
    $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  create publication supabase_realtime;
  grant usage on schema public, auth, storage to authenticated, anon;
  grant execute on function auth.uid() to authenticated, anon;
`);

for (const f of readdirSync("supabase/migrations").sort()) {
  await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
  console.log("✓ applied", f);
}
await db.exec(`
  grant select, insert, update, delete on all tables in schema public to authenticated;
  grant select on public.student_course_stats, public.offering_summary, public.class_summary, public.session_summary to authenticated;
`);

const ADMIN = "00000000-0000-0000-0000-00000000000a";
const STU_USER = "00000000-0000-0000-0000-00000000000b";

const one = async <T,>(sql: string, params: unknown[] = []) =>
  (await db.query<T>(sql, params)).rows[0];

// Act as a given user through RLS.
async function as<T>(uid: string, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role authenticated; select set_config('request.uid', '${uid}', false);`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.uid', '', false);`); }
}

// --- setup as superuser
await db.exec(`
  insert into auth.users values ('${ADMIN}', 'teacher@ihs'), ('${STU_USER}', 'car-f26-01@students');
  insert into public.profiles (id, role, full_name) values
    ('${ADMIN}', 'admin', 'ICT Teacher'), ('${STU_USER}', 'student', 'Muhammad Aimal Khan');
  insert into public.teachers (user_id, full_name) values ('${ADMIN}', 'ICT Teacher');
`);
const cls = await one<{ id: string }>(`
  insert into public.classes (department_id, batch_id)
  select d.id, b.id from public.departments d, public.batches b where d.code='CAR' and b.name='Batch 3'
  returning id`);
await db.query(
  `insert into public.students (roll_no, full_name, class_id, user_id) values
   ('CAR-F26-01','Muhammad Aimal Khan',$1,$2), ('CAR-F26-02','Sajid Khan',$1,null), ('CAR-F26-03','Shah Faisal',$1,null)`,
  [cls!.id, STU_USER],
);

// --- offering creation auto-enrolls the class
const off = await as(ADMIN, () => one<{ id: string }>(`
  insert into public.course_offerings (subject_id, class_id, teacher_id)
  select s.id, $1, public.my_teacher_id() from public.subjects s where s.code='ICT' returning id`, [cls!.id]));
const enrolled = await one<{ n: number }>(`select count(*)::int n from public.enrollments where offering_id=$1`, [off!.id]);
assert.equal(enrolled!.n, 3); console.log("✓ offering auto-enrolls class (3)");

// late joiner is enrolled automatically
await db.query(`insert into public.students (roll_no, full_name, class_id) values ('CAR-F26-04','Mehwish Ali',$1)`, [cls!.id]);
assert.equal((await one<{ n: number }>(`select count(*)::int n from public.enrollments where offering_id=$1`, [off!.id]))!.n, 4);
console.log("✓ new student auto-enrolled");

// --- session + scanning
const ses = await as(ADMIN, () => one<{ id: string }>(`insert into public.sessions (offering_id) values ($1) returning id`, [off!.id]));
const tok = (roll: string) => one<{ qr_token: string }>(`select qr_token from public.students where roll_no=$1`, [roll]);
const t1 = (await tok("CAR-F26-01"))!.qr_token;
assert.match(t1, /^[0-9a-f]{16}$/);

const scan = (token: string) => as(ADMIN, () =>
  one<{ r: { result: string } }>(`select public.mark_attendance($1, $2) r`, [ses!.id, token]));
assert.equal((await scan(t1))!.r.result, "marked");
assert.equal((await scan(t1))!.r.result, "already");
assert.equal((await scan("nope"))!.r.result, "unknown");
assert.equal((await scan((await tok("CAR-F26-02"))!.qr_token))!.r.result, "marked");
console.log("✓ scan marks once, duplicates rejected, unknown tokens rejected");

// --- close: the rest become absent
const absent = await as(ADMIN, () => one<{ n: number }>(`select public.close_session($1) n`, [ses!.id]));
assert.equal(absent!.n, 2);
assert.equal((await scan(t1))!.r.result, "session_closed");
console.log("✓ close_session marks 2 absent and blocks further scans");

// --- correction is audited
const s3 = (await one<{ id: string }>(`select id from public.students where roll_no='CAR-F26-03'`))!.id;
await as(ADMIN, () => db.query(`select public.set_attendance_status($1,$2,'excused','Medical leave')`, [ses!.id, s3]));
const audit = await one<{ old_status: string; new_status: string; reason: string }>(`select * from public.attendance_audit`);
assert.deepEqual([audit!.old_status, audit!.new_status, audit!.reason], ["absent", "excused", "Medical leave"]);
console.log("✓ edits recorded in audit log");

// --- stats view
const st = await as(ADMIN, () => db.query<{ roll_no: string; total: number; present: number; percentage: string | null }>(`
  select s.roll_no, v.total::int, v.present::int, v.percentage from public.student_course_stats v
  join public.students s on s.id = v.student_id order by s.roll_no`));
assert.deepEqual(st.rows.map((r) => [r.roll_no, r.total, r.present, r.percentage]), [
  ["CAR-F26-01", 1, 1, "100.0"],
  ["CAR-F26-02", 1, 1, "100.0"],
  ["CAR-F26-03", 1, 0, null], // excused → excluded from denominator
  ["CAR-F26-04", 1, 0, "0.0"],
]);
console.log("✓ stats view totals and percentages");

// --- summary views
const os = await as(ADMIN, () => one<{ students: number; sessions: number }>(`select students::int, sessions::int from public.offering_summary`));
assert.deepEqual([os!.students, os!.sessions], [4, 1]);
const cs = await as(ADMIN, () => one<{ students: number }>(`select students::int from public.class_summary`));
assert.equal(cs!.students, 4);
const ss = await as(ADMIN, () => one<{ enrolled: number; present: number; absent: number; excused: number }>(`select enrolled::int, present::int, absent::int, excused::int from public.session_summary`));
assert.deepEqual([ss!.enrolled, ss!.present, ss!.absent, ss!.excused], [4, 2, 1, 1]);
console.log("✓ offering_summary / class_summary / session_summary counts");

// --- class upsert used by the importer (NULLS NOT DISTINCT conflict target)
await as(ADMIN, () => db.query(`insert into public.classes (department_id, batch_id, section)
  select department_id, batch_id, null from public.classes limit 1
  on conflict (department_id, batch_id, section) do nothing`));
assert.equal((await one<{ n: number }>(`select count(*)::int n from public.classes`))!.n, 1);
console.log("✓ class upsert with null section is idempotent");

// --- RLS: student sees only self
await as(STU_USER, async () => {
  const studs = await db.query(`select roll_no from public.students`);
  assert.deepEqual(studs.rows, [{ roll_no: "CAR-F26-01" }]);
  const att = await db.query(`select student_id from public.attendance`);
  assert.equal(att.rows.length, 1);
  const stats = await db.query(`select total from public.student_course_stats`);
  assert.equal(stats.rows.length, 1);
  assert.equal((await db.query(`select id from public.sessions`)).rows.length, 1);
  await assert.rejects(db.query(`select public.mark_attendance($1,$2)`, [ses!.id, t1]), /not allowed/);
  const upd = await db.query(`update public.attendance set status='present' returning id`);
  assert.equal(upd.rows.length, 0);
});
console.log("✓ RLS: student reads only own data and cannot mark/edit attendance");

console.log("\nAll database checks passed.");
