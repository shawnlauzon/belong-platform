-- Rename location_name column to location to match domain model exactly
ALTER TABLE public.resources RENAME COLUMN location_name TO location;