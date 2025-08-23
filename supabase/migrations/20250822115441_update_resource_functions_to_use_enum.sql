-- Migration: Update resource functions to use resource_type enum
-- Note: This migration was reconstructed from production state
-- Original migration was applied directly to production without being committed

-- Update get_resource_renewal_days to use enum (no dependencies)
CREATE OR REPLACE FUNCTION public.get_resource_renewal_days(resource_type resource_type)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT CASE resource_type
    WHEN 'offer' THEN 30
    WHEN 'request' THEN 14
    WHEN 'event' THEN NULL  -- Events don't auto-expire
    ELSE 30  -- Default for unknown types
  END;
$function$;

-- Update calculate_resource_expiration to use enum (depends on get_resource_renewal_days)
CREATE OR REPLACE FUNCTION public.calculate_resource_expiration(resource_type resource_type, last_renewed_at timestamp with time zone)
 RETURNS timestamp with time zone
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT 
    CASE 
      WHEN public.get_resource_renewal_days(resource_type) IS NULL THEN NULL
      ELSE last_renewed_at + (public.get_resource_renewal_days(resource_type) || ' days')::interval
    END;
$function$;

-- Update is_resource_expired to use enum (depends on get_resource_renewal_days and calculate_resource_expiration)
CREATE OR REPLACE FUNCTION public.is_resource_expired(resource_type resource_type, last_renewed_at timestamp with time zone)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT 
    CASE 
      WHEN public.get_resource_renewal_days(resource_type) IS NULL THEN false  -- Events never expire
      WHEN last_renewed_at IS NULL THEN false  -- Not yet renewed, not expired
      ELSE public.calculate_resource_expiration(resource_type, last_renewed_at) < now()
    END;
$function$;

-- Update is_resource_active to use enum (depends on is_resource_expired)
CREATE OR REPLACE FUNCTION public.is_resource_active(resource_type resource_type, last_renewed_at timestamp with time zone)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT NOT public.is_resource_expired(resource_type, last_renewed_at);
$function$;