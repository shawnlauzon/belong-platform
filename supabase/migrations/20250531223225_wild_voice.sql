-- Create API keys table with RLS enabled
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  service text not null unique,
  key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.api_keys enable row level security;

-- Only allow service role to access this table
create policy "Service role can manage api_keys"
  on public.api_keys
  using (auth.jwt() ->> 'role' = 'service_role');

-- Automatically update the updated_at timestamp
create trigger set_updated_at
  before update on public.api_keys
  for each row
  execute function public.set_updated_at();