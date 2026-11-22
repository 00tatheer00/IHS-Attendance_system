-- Not every department is split into sections. Departments with
-- has_sections = false keep one class per batch (section = null).
alter table public.departments
  add column has_sections boolean not null default true;

update public.departments set has_sections = false where code in ('MLT', 'SUR', 'EME');

-- Merge Section A + B back into one class for those departments.
do $$
declare
  a record;
  b_id uuid;
begin
  for a in
    select c.* from public.classes c
    join public.departments d on d.id = c.department_id
    where not d.has_sections and c.section in ('A', 'B')
    order by c.section            -- 'A' first; becomes the merged class
  loop
    -- skip if this class was already merged away in an earlier iteration
    if not exists (select 1 from public.classes where id = a.id) then continue; end if;

    if exists (
      select 1 from public.sessions s join public.course_offerings co on co.id = s.offering_id
      join public.classes c on c.id = co.class_id
      where c.department_id = a.department_id and c.batch_id = a.batch_id and c.section is not null
    ) then
      raise exception 'Department % already has classes held in its sections; merge manually.', a.department_id;
    end if;

    select id into b_id from public.classes
      where department_id = a.department_id and batch_id = a.batch_id and section is not null and id <> a.id;

    update public.classes set section = null where id = a.id;

    if b_id is not null then
      delete from public.course_offerings where class_id = b_id;           -- its enrollments go with it
      update public.students set class_id = a.id where class_id = b_id;    -- trigger enrolls them in a's courses
      delete from public.classes where id = b_id;
    end if;
  end loop;
end $$;
