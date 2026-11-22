-- A teacher reads only the students of classes they teach; the admin reads
-- everyone; a student reads only themselves.
create function public.teaches_class(p_class uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.course_offerings o
                 where o.class_id = p_class and o.teacher_id = public.my_teacher_id())
$$;

drop policy students_select on public.students;
create policy students_select on public.students for select to authenticated
  using (public.is_admin() or user_id = auth.uid() or public.teaches_class(class_id));
