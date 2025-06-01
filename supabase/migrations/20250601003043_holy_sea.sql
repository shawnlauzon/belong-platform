-- Make location nullable
alter table public.resources alter column location drop not null;

-- Make meetup_flexibility nullable and update its check constraint
alter table public.resources alter column meetup_flexibility drop not null;
alter table public.resources drop constraint if exists resources_meetup_flexibility_check;
alter table public.resources add constraint resources_meetup_flexibility_check 
  check (meetup_flexibility is null or meetup_flexibility in ('home_only', 'public_meetup_ok', 'delivery_possible'));