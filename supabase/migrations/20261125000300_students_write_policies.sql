-- The old "students_write" policy was FOR ALL, which also granted SELECT to
-- every staff member and bypassed the teacher read restriction. Split it into
-- insert / update / delete so reads follow students_select only.
drop policy students_write on public.students;

create policy students_insert on public.students for insert to authenticated
  with check (public.is_staff());

create policy students_update on public.students for update to authenticated
  using (public.is_admin() or public.teaches_class(class_id))
  with check (public.is_staff());

create policy students_delete on public.students for delete to authenticated
  using (public.is_admin() or public.teaches_class(class_id));
