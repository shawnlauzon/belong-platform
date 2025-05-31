create extension if not exists postgis;

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references auth.users(id) on delete cascade,
  type text not null check (type in ('offer', 'request')),
  category text not null check (category in ('tools', 'skills', 'food', 'supplies', 'other')),
  title text not null,
  description text not null,
  image_urls text[] not null default '{}',
  location geometry(Point, 4326) not null,
  pickup_instructions text,
  parking_info text,
  meetup_flexibility text not null check (meetup_flexibility in ('home_only', 'public_meetup_ok', 'delivery_possible')),
  availability text,
  is_active boolean not null default true,
  times_helped integer not null default 0,
  created_at timestamptz not null default now(),

  constraint resources_title_min_length check (char_length(title) >= 3),
  constraint resources_description_min_length check (char_length(description) >= 10)
);

-- Enable RLS
alter table public.resources enable row level security;

-- Create policies
create policy "Resources are viewable by everyone"
  on public.resources for select
  using (true);

create policy "Users can insert their own resources"
  on public.resources for insert
  with check (auth.uid() = member_id);

create policy "Users can update their own resources"
  on public.resources for update
  using (auth.uid() = member_id);

-- Create indexes
create index resources_location_idx on public.resources using gist(location);
create index resources_member_id_idx on public.resources(member_id);
create index resources_created_at_idx on public.resources(created_at desc);
create index resources_category_idx on public.resources(category);
create index resources_type_idx on public.resources(type);