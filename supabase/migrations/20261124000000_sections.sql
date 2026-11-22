-- Sections: every department's class is split into Section A (roll 1–50)
-- and Section B (roll 51+). Each course is split the same way, so attendance
-- for Section A never marks Section B absent.

-- Section from a roll number such as CAR-F26-51 → 'B'.
create function public.section_for_roll(p_roll text) returns text
language sql immutable set search_path = ''
as $$ select case when (regexp_match(p_roll, '([0-9]+)$'))[1]::int <= 50 then 'A' else 'B' end $$;

do $$
declare
  c record;
  o record;
  a_id uuid;
  b_id uuid;
begin
  for c in select * from public.classes where section is null loop
    -- Safety: never discard attendance history
    if exists (select 1 from public.sessions s join public.course_offerings co on co.id = s.offering_id where co.class_id = c.id) then
      raise exception 'Class % already has classes held; split it manually.', c.id;
    end if;

    insert into public.classes (department_id, batch_id, section) values (c.department_id, c.batch_id, 'A')
      on conflict (department_id, batch_id, section) do update set section = excluded.section returning id into a_id;
    insert into public.classes (department_id, batch_id, section) values (c.department_id, c.batch_id, 'B')
      on conflict (department_id, batch_id, section) do update set section = excluded.section returning id into b_id;

    update public.students
      set class_id = case when public.section_for_roll(roll_no) = 'A' then a_id else b_id end
      where class_id = c.id;

    for o in select * from public.course_offerings where class_id = c.id loop
      -- inserting an offering enrolls that section's students automatically (trigger)
      insert into public.course_offerings (subject_id, class_id, teacher_id, term_label, is_active)
      values (o.subject_id, a_id, o.teacher_id, o.term_label, o.is_active),
             (o.subject_id, b_id, o.teacher_id, o.term_label, o.is_active)
      on conflict (subject_id, class_id, term_label) do nothing;
      delete from public.course_offerings where id = o.id;
    end loop;

    delete from public.classes where id = c.id;
  end loop;
end $$;
