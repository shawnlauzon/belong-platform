-- Make resource category optional
alter table public.resources 
  alter column category drop not null;

-- Keep the check constraint for valid values when category is provided
alter table public.resources 
  drop constraint if exists resources_category_check;

alter table public.resources 
  add constraint resources_category_check 
  check (category is null or category in ('tools', 'skills', 'food', 'supplies', 'other'));