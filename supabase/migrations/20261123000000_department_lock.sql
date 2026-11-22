-- Departments can be locked: hidden from the public portal, not openable in the
-- dashboard, excluded from imports and new courses. Unlock any time in Settings.
alter table public.departments
  add column is_locked boolean not null default false;

-- Not taught by this teacher (yet)
update public.departments set is_locked = true where code in ('RAD', 'OPT');
