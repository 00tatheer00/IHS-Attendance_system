-- =====================================================================
-- IHS Attendance — initial schema
-- Tables, helper functions, RLS policies, attendance RPCs, stats view.
-- =====================================================================

-- ---------- Enums ----------------------------------------------------
create type public.user_role         as enum ('admin', 'teacher', 'student');
create type public.gender            as enum ('male', 'female');
create type public.student_status    as enum ('active', 'inactive', 'graduated');
create type public.session_status    as enum ('open', 'closed', 'cancelled');
create type public.attendance_status as enum ('present', 'absent', 'excused');
create type public.attendance_method as enum ('qr', 'manual', 'auto');

-- ---------- Utilities ------------------------------------------------
-- Short, unguessable token printed in the ID-card QR code.
-- 16 hex chars = 64 bits; short enough to keep the QR code low-density
-- (which makes scanning faster).
create function public.new_qr_token() returns text
language sql volatile set search_path = ''
as $$ select substr(replace(gen_random_uuid()::text, '-', ''), 1, 16) $$;

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = ''
as $$ begin new.updated_at := now(); return new; end $$;

-- ---------- People & academic structure ------------------------------
create table public.profiles (
  id                   uuid primary key references auth.users (id) on delete cascade,
  role                 public.user_role not null,
  full_name            text not null,
  must_change_password boolean not null default false,
  created_at           timestamptz not null default now()
);

create table public.departments (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique check (code ~ '^[A-Z]{2,5}$'),
  name       text not null,
  created_at timestamptz not null default now()
);

create table public.batches (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,          -- "Batch 3"
  intake_code   text,                          -- "F26" (as used in roll numbers)
  session_label text,                          -- "2026–2030"
  created_at    timestamptz not null default now()
);

-- A class is one department's cohort within a batch (e.g. BS Cardiology · Batch 3).
create table public.classes (
  id            uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments (id) on delete restrict,
  batch_id      uuid not null references public.batches (id) on delete restrict,
  section       text,                          -- null = all sections combined
  created_at    timestamptz not null default now(),
  unique nulls not distinct (department_id, batch_id, section)
);

create table public.teachers (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid unique references auth.users (id) on delete set null,
  full_name  text not null,
  email      text,
  created_at timestamptz not null default now()
);

create table public.subjects (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  name       text not null,
  created_at timestamptz not null default now()
);

create table public.students (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid unique references auth.users (id) on delete set null,
  roll_no     text not null unique check (roll_no = upper(roll_no)),
  full_name   text not null,
  father_name text,
  gender      public.gender,
  cnic        text check (cnic ~ '^[0-9]{5}-[0-9]{7}-[0-9]$'),
  phone       text,
  class_id    uuid not null references public.classes (id) on delete restrict,
  photo_path  text,
  qr_token    text not null unique default public.new_qr_token(),
  status      public.student_status not null default 'active',
  remarks     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index students_class_idx on public.students (class_id);
create trigger students_touch before update on public.students
  for each row execute function public.touch_updated_at();

-- ---------- Teaching & attendance ------------------------------------
-- A course offering = one subject taught to one class by one teacher in one term.
create table public.course_offerings (
  id         uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete restrict,
  class_id   uuid not null references public.classes (id) on delete restrict,
  teacher_id uuid not null references public.teachers (id) on delete restrict,
  term_label text not null default 'Semester 1',
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  unique (subject_id, class_id, term_label)
);
create index offerings_teacher_idx on public.course_offerings (teacher_id);

create table public.enrollments (
  offering_id uuid not null references public.course_offerings (id) on delete cascade,
  student_id  uuid not null references public.students (id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  primary key (offering_id, student_id)
);
create index enrollments_student_idx on public.enrollments (student_id);

create table public.sessions (
  id           uuid primary key default gen_random_uuid(),
  offering_id  uuid not null references public.course_offerings (id) on delete cascade,
  session_date date not null default (now() at time zone 'Asia/Karachi')::date,
  started_at   timestamptz not null default now(),
  closed_at    timestamptz,
  status       public.session_status not null default 'open',
  topic        text,
  created_by   uuid references auth.users (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now()
);
create index sessions_offering_idx on public.sessions (offering_id, session_date desc);

create table public.attendance (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  status     public.attendance_status not null,
  method     public.attendance_method not null,
  marked_at  timestamptz not null default now(),
  marked_by  uuid references auth.users (id) on delete set null default auth.uid(),
  note       text,
  unique (session_id, student_id)        -- one record per student per session
);
create index attendance_student_idx on public.attendance (student_id);

create table public.attendance_audit (
  id            bigint generated always as identity primary key,
  attendance_id uuid not null references public.attendance (id) on delete cascade,
  old_status    public.attendance_status,
  new_status    public.attendance_status not null,
  reason        text,
  changed_by    uuid references auth.users (id) on delete set null,
  changed_at    timestamptz not null default now()
);

-- ---------- Role helpers (used by RLS) -------------------------------
create function public.my_role() returns public.user_role
language sql stable security definer set search_path = ''
as $$ select role from public.profiles where id = auth.uid() $$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false) $$;

create function public.is_staff() returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce((select role in ('admin', 'teacher') from public.profiles where id = auth.uid()), false) $$;

create function public.my_teacher_id() returns uuid
language sql stable security definer set search_path = ''
as $$ select id from public.teachers where user_id = auth.uid() $$;

create function public.my_student_id() returns uuid
language sql stable security definer set search_path = ''
as $$ select id from public.students where user_id = auth.uid() $$;

create function public.can_manage_offering(p_offering uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1 from public.course_offerings o
    where o.id = p_offering and o.teacher_id = public.my_teacher_id()
  )
$$;

create function public.session_offering(p_session uuid) returns uuid
language sql stable security definer set search_path = ''
as $$ select offering_id from public.sessions where id = p_session $$;

create function public.is_enrolled(p_offering uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.enrollments
                 where offering_id = p_offering and student_id = public.my_student_id())
$$;

-- ---------- Automatic enrollment -------------------------------------
-- New offering → enroll every active student of that class.
create function public.enroll_class_into_offering() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.enrollments (offering_id, student_id)
  select new.id, s.id from public.students s
  where s.class_id = new.class_id and s.status = 'active'
  on conflict do nothing;
  return new;
end $$;
create trigger offerings_enroll after insert on public.course_offerings
  for each row execute function public.enroll_class_into_offering();

-- New student (or class change) → enroll into the class's active offerings.
create function public.enroll_student_into_offerings() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'active' then
    insert into public.enrollments (offering_id, student_id)
    select o.id, new.id from public.course_offerings o
    where o.class_id = new.class_id and o.is_active
    on conflict do nothing;
  end if;
  return new;
end $$;
create trigger students_enroll after insert or update of class_id, status on public.students
  for each row execute function public.enroll_student_into_offerings();

-- ---------- Audit trail for attendance edits -------------------------
create function public.audit_attendance() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    insert into public.attendance_audit (attendance_id, old_status, new_status, reason, changed_by)
    values (new.id, old.status, new.status, new.note, auth.uid());
  end if;
  return new;
end $$;
create trigger attendance_audit_trg after update on public.attendance
  for each row execute function public.audit_attendance();

-- ---------- Attendance RPCs ------------------------------------------
-- Mark a student present by the token in their QR code.
-- Idempotent: scanning the same card twice returns 'already'.
create function public.mark_attendance(
  p_session   uuid,
  p_token     text,
  p_marked_at timestamptz default now()
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_offering uuid;
  v_status   public.session_status;
  v_student  record;
  v_rows     int;
begin
  select offering_id, status into v_offering, v_status
  from public.sessions where id = p_session;
  if not found then
    return jsonb_build_object('result', 'no_session');
  end if;
  if not public.can_manage_offering(v_offering) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_status <> 'open' then
    return jsonb_build_object('result', 'session_closed');
  end if;

  select id, roll_no, full_name into v_student
  from public.students where qr_token = p_token;
  if not found then
    return jsonb_build_object('result', 'unknown');
  end if;

  if not exists (select 1 from public.enrollments
                 where offering_id = v_offering and student_id = v_student.id) then
    return jsonb_build_object('result', 'not_enrolled',
      'student', jsonb_build_object('id', v_student.id, 'roll_no', v_student.roll_no, 'full_name', v_student.full_name));
  end if;

  insert into public.attendance (session_id, student_id, status, method, marked_at, marked_by)
  values (p_session, v_student.id, 'present', 'qr', least(coalesce(p_marked_at, now()), now()), auth.uid())
  on conflict (session_id, student_id) do update
    set status = 'present', method = 'qr', marked_at = excluded.marked_at, marked_by = excluded.marked_by
    where public.attendance.status <> 'present';
  get diagnostics v_rows = row_count;

  return jsonb_build_object(
    'result', case when v_rows = 1 then 'marked' else 'already' end,
    'student', jsonb_build_object('id', v_student.id, 'roll_no', v_student.roll_no, 'full_name', v_student.full_name));
end $$;

-- Manually set a student's status for a session (manual mark or correction).
create function public.set_attendance_status(
  p_session uuid,
  p_student uuid,
  p_status  public.attendance_status,
  p_note    text default null
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.can_manage_offering(public.session_offering(p_session)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into public.attendance (session_id, student_id, status, method, note, marked_by)
  values (p_session, p_student, p_status, 'manual', p_note, auth.uid())
  on conflict (session_id, student_id) do update
    set status = excluded.status, method = 'manual', note = excluded.note,
        marked_by = excluded.marked_by, marked_at = now();
end $$;

-- Close a session: everyone enrolled who was not marked becomes absent.
create function public.close_session(p_session uuid) returns int
language plpgsql security definer set search_path = ''
as $$
declare
  v_offering uuid := public.session_offering(p_session);
  v_absent   int;
begin
  if v_offering is null or not public.can_manage_offering(v_offering) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  insert into public.attendance (session_id, student_id, status, method, marked_by)
  select p_session, e.student_id, 'absent', 'auto', auth.uid()
  from public.enrollments e
  join public.students s on s.id = e.student_id and s.status = 'active'
  where e.offering_id = v_offering
  on conflict (session_id, student_id) do nothing;
  get diagnostics v_absent = row_count;

  update public.sessions set status = 'closed', closed_at = now() where id = p_session;
  return v_absent;
end $$;

create function public.reopen_session(p_session uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.can_manage_offering(public.session_offering(p_session)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.sessions set status = 'open', closed_at = null where id = p_session;
end $$;

-- Student clears the "change your password" flag after changing it.
create function public.password_changed() returns void
language sql security definer set search_path = ''
as $$ update public.profiles set must_change_password = false where id = auth.uid() $$;

-- ---------- Stats view -----------------------------------------------
-- Per student per course: totals and percentage. Excused sessions are
-- excluded from the percentage denominator. Respects RLS of the caller.
create view public.student_course_stats with (security_invoker = true) as
select
  e.offering_id,
  e.student_id,
  count(a.id)                                          as total,
  count(a.id) filter (where a.status = 'present')      as present,
  count(a.id) filter (where a.status = 'absent')       as absent,
  count(a.id) filter (where a.status = 'excused')      as excused,
  round(100.0 * count(a.id) filter (where a.status = 'present')
        / nullif(count(a.id) filter (where a.status <> 'excused'), 0), 1) as percentage
from public.enrollments e
left join public.sessions s
  on s.offering_id = e.offering_id and s.status <> 'cancelled'
left join public.attendance a
  on a.session_id = s.id and a.student_id = e.student_id
group by e.offering_id, e.student_id;

-- Course and class head-counts for dashboards (respects caller's RLS).
create view public.offering_summary with (security_invoker = true) as
select
  o.id as offering_id,
  (select count(*) from public.enrollments e where e.offering_id = o.id)                              as students,
  (select count(*) from public.sessions s where s.offering_id = o.id and s.status <> 'cancelled')     as sessions,
  (select max(s.session_date) from public.sessions s where s.offering_id = o.id and s.status <> 'cancelled') as last_session
from public.course_offerings o;

-- Per-session head-counts (respects caller's RLS).
create view public.session_summary with (security_invoker = true) as
select
  s.id as session_id,
  s.offering_id,
  (select count(*) from public.enrollments e where e.offering_id = s.offering_id)                 as enrolled,
  (select count(*) from public.attendance a where a.session_id = s.id and a.status = 'present')  as present,
  (select count(*) from public.attendance a where a.session_id = s.id and a.status = 'absent')   as absent,
  (select count(*) from public.attendance a where a.session_id = s.id and a.status = 'excused')  as excused
from public.sessions s;

create view public.class_summary with (security_invoker = true) as
select c.id as class_id, count(s.id) filter (where s.status = 'active') as students
from public.classes c
left join public.students s on s.class_id = c.id
group by c.id;

-- ---------- Row Level Security ---------------------------------------
alter table public.profiles         enable row level security;
alter table public.departments      enable row level security;
alter table public.batches          enable row level security;
alter table public.classes          enable row level security;
alter table public.teachers         enable row level security;
alter table public.subjects         enable row level security;
alter table public.students         enable row level security;
alter table public.course_offerings enable row level security;
alter table public.enrollments      enable row level security;
alter table public.sessions         enable row level security;
alter table public.attendance       enable row level security;
alter table public.attendance_audit enable row level security;

-- profiles: read own; staff read all. Writes only via service role / RPC.
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());

-- reference data: everyone signed in can read; staff can write.
create policy departments_select on public.departments for select to authenticated using (true);
create policy departments_write  on public.departments for all    to authenticated using (public.is_staff()) with check (public.is_staff());
create policy batches_select     on public.batches     for select to authenticated using (true);
create policy batches_write      on public.batches     for all    to authenticated using (public.is_staff()) with check (public.is_staff());
create policy classes_select     on public.classes     for select to authenticated using (true);
create policy classes_write      on public.classes     for all    to authenticated using (public.is_staff()) with check (public.is_staff());
create policy subjects_select    on public.subjects    for select to authenticated using (true);
create policy subjects_write     on public.subjects    for all    to authenticated using (public.is_staff()) with check (public.is_staff());

-- teachers: staff read; admin writes. Students may read names of their teachers.
create policy teachers_select on public.teachers for select to authenticated
  using (public.is_staff() or exists (
    select 1 from public.course_offerings o
    where o.teacher_id = teachers.id and public.is_enrolled(o.id)));
create policy teachers_write on public.teachers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- students: staff read/write all; a student reads only their own row.
create policy students_select on public.students for select to authenticated
  using (public.is_staff() or user_id = auth.uid());
create policy students_write on public.students for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- course offerings
create policy offerings_select on public.course_offerings for select to authenticated
  using (public.is_staff() or public.is_enrolled(id));
create policy offerings_insert on public.course_offerings for insert to authenticated
  with check (public.is_admin() or teacher_id = public.my_teacher_id());
create policy offerings_modify on public.course_offerings for update to authenticated
  using (public.can_manage_offering(id)) with check (public.can_manage_offering(id));
create policy offerings_delete on public.course_offerings for delete to authenticated
  using (public.can_manage_offering(id));

-- enrollments
create policy enrollments_select on public.enrollments for select to authenticated
  using (public.is_staff() or student_id = public.my_student_id());
create policy enrollments_write on public.enrollments for all to authenticated
  using (public.can_manage_offering(offering_id)) with check (public.can_manage_offering(offering_id));

-- sessions
create policy sessions_select on public.sessions for select to authenticated
  using (public.can_manage_offering(offering_id) or public.is_enrolled(offering_id));
create policy sessions_write on public.sessions for all to authenticated
  using (public.can_manage_offering(offering_id)) with check (public.can_manage_offering(offering_id));

-- attendance
create policy attendance_select on public.attendance for select to authenticated
  using (student_id = public.my_student_id()
         or public.can_manage_offering(public.session_offering(session_id)));
create policy attendance_write on public.attendance for all to authenticated
  using (public.can_manage_offering(public.session_offering(session_id)))
  with check (public.can_manage_offering(public.session_offering(session_id)));

create policy audit_select on public.attendance_audit for select to authenticated
  using (public.is_staff());

-- ---------- Function privileges --------------------------------------
revoke execute on function public.mark_attendance(uuid, text, timestamptz)                  from public, anon;
revoke execute on function public.set_attendance_status(uuid, uuid, public.attendance_status, text) from public, anon;
revoke execute on function public.close_session(uuid)                                       from public, anon;
revoke execute on function public.reopen_session(uuid)                                      from public, anon;
revoke execute on function public.password_changed()                                        from public, anon;
grant  execute on function public.mark_attendance(uuid, text, timestamptz)                  to authenticated;
grant  execute on function public.set_attendance_status(uuid, uuid, public.attendance_status, text) to authenticated;
grant  execute on function public.close_session(uuid)                                       to authenticated;
grant  execute on function public.reopen_session(uuid)                                      to authenticated;
grant  execute on function public.password_changed()                                        to authenticated;

-- ---------- Realtime -------------------------------------------------
-- Student portal listens for changes to its own attendance rows.
alter publication supabase_realtime add table public.attendance;

-- ---------- Storage: student photos (private) ------------------------
insert into storage.buckets (id, name, public)
values ('student-photos', 'student-photos', false)
on conflict (id) do nothing;

create policy photos_staff_all on storage.objects for all to authenticated
  using (bucket_id = 'student-photos' and public.is_staff())
  with check (bucket_id = 'student-photos' and public.is_staff());
create policy photos_own_read on storage.objects for select to authenticated
  using (bucket_id = 'student-photos'
         and (storage.foldername(name))[1] = public.my_student_id()::text);

-- ---------- Seed: IHS reference data ---------------------------------
insert into public.departments (code, name) values
  ('CAR', 'Cardiology'),
  ('RAD', 'Radiology'),
  ('DEN', 'Dental'),
  ('MLT', 'Medical Lab Technology'),
  ('EME', 'Emergency'),
  ('SUR', 'Surgical'),
  ('OPT', 'Optometry');

insert into public.batches (name, intake_code, session_label)
values ('Batch 3', 'F26', '2026–2030');

insert into public.subjects (code, name)
values ('ICT', 'Information & Communication Technology');
