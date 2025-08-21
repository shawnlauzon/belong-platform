-- Split resource location field to match events table structure
-- Add location string field and rename existing location to coordinates

-- Rename existing location column to coordinates to match events table structure
ALTER TABLE public.resources RENAME COLUMN location TO coordinates;

-- Add new location column for location name/address (like events table)
ALTER TABLE public.resources ADD COLUMN location text;

-- Update the index name to reflect the new column name
DROP INDEX resources_location_idx;
CREATE INDEX resources_coordinates_idx ON public.resources USING gist(coordinates);

-- Note: The location field is nullable to handle existing records
-- Future records should populate both coordinates and location fields