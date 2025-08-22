-- Add auto-expiration field to resources table
ALTER TABLE public.resources
ADD COLUMN last_renewed_at timestamp with time zone;

-- Create function to get renewal period days based on resource type
CREATE OR REPLACE FUNCTION public.get_resource_renewal_days(resource_type text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE resource_type
    WHEN 'offer' THEN 30
    WHEN 'request' THEN 14
    WHEN 'event' THEN NULL  -- Events don't auto-expire
    ELSE 30  -- Default for unknown types
  END;
$$;

-- Create function to calculate expiration timestamp
CREATE OR REPLACE FUNCTION public.calculate_resource_expiration(resource_type text, last_renewed_at timestamp with time zone)
RETURNS timestamp with time zone
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 
    CASE 
      WHEN public.get_resource_renewal_days(resource_type) IS NULL THEN NULL
      ELSE last_renewed_at + (public.get_resource_renewal_days(resource_type) || ' days')::interval
    END;
$$;

-- Create function to check if resource is expired (for query filtering)
CREATE OR REPLACE FUNCTION public.is_resource_expired(resource_type text, last_renewed_at timestamp with time zone)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 
    CASE 
      WHEN public.get_resource_renewal_days(resource_type) IS NULL THEN false  -- Events never expire
      WHEN last_renewed_at IS NULL THEN false  -- Not yet renewed, not expired
      ELSE public.calculate_resource_expiration(resource_type, last_renewed_at) < now()
    END;
$$;

-- Create function to check if resource is active (opposite of expired)
CREATE OR REPLACE FUNCTION public.is_resource_active(resource_type text, last_renewed_at timestamp with time zone)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NOT public.is_resource_expired(resource_type, last_renewed_at);
$$;