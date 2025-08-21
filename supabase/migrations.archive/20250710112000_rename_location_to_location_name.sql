-- Rename location fields to location_name and add center_name for communities
-- This migration aligns database field names with the new domain model naming convention

-- Rename events.location to events.location_name
ALTER TABLE public.events RENAME COLUMN location TO location_name;

-- Rename resources.location to resources.location_name
ALTER TABLE public.resources RENAME COLUMN location TO location_name;

-- Add center_name field to communities table
ALTER TABLE public.communities ADD COLUMN center_name text;

-- Update comments for clarity
COMMENT ON COLUMN public.events.location_name IS 'Human-readable location name or address for the event';
COMMENT ON COLUMN public.resources.location_name IS 'Human-readable location name or address for the resource';
COMMENT ON COLUMN public.communities.center_name IS 'Human-readable name for the community center location';