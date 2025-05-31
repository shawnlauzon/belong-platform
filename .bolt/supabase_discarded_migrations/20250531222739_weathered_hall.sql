-- Create a table to store API keys
create table api_keys (
  id uuid primary key default gen_random_uuid(),
  service text not null unique,
  key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table api_keys enable row level security;

-- Only allow the service role to access this table
create policy "Service role can manage api keys"
  on api_keys
  using (auth.jwt()->>'role' = 'service_role');

-- Create an updated_at trigger
create function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_api_keys_updated_at
  before update on api_keys
  for each row
  execute function update_updated_at_column();