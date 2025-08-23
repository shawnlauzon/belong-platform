-- Add PostgREST computed column functions for resource expiration
-- These functions take a table row type as the first parameter,
-- allowing PostgREST to recognize them as computed columns

-- Computed column for expiration date
CREATE OR REPLACE FUNCTION expires_at(resources) 
RETURNS timestamp with time zone 
LANGUAGE sql 
IMMUTABLE
AS $$
  SELECT calculate_resource_expiration($1.type, $1.last_renewed_at);
$$;

-- Computed column for active status (used in feed filtering)
CREATE OR REPLACE FUNCTION is_active(resources)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT is_resource_active($1.type, $1.last_renewed_at);
$$;