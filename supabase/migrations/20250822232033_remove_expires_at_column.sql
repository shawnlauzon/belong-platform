-- Drop the expires_at column from resources table
-- This column is no longer used since expiration is now calculated dynamically
-- based on last_renewed_at and resource type via database functions

ALTER TABLE public.resources 
DROP COLUMN IF EXISTS expires_at;