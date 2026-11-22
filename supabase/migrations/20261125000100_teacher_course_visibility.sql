-- Teachers see only their own courses (and those courses' enrollments);
-- the admin still sees everything. Previously any staff member could read
-- every course.
drop policy offerings_select on public.course_offerings;
create policy offerings_select on public.course_offerings for select to authenticated
  using (public.can_manage_offering(id) or public.is_enrolled(id));

drop policy enrollments_select on public.enrollments;
create policy enrollments_select on public.enrollments for select to authenticated
  using (public.can_manage_offering(offering_id) or student_id = public.my_student_id());
