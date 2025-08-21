/*
  # Add center PostGIS column to communities table

  This migration adds a mandatory center point column to the communities table
  as a PostGIS geometry point. This extracts the center coordinate from the
  boundary JSON structure to a dedicated PostGIS column for spatial queries.

  Changes:
  1. Add center geometry(Point, 4326) NOT NULL column
  2. Create spatial index on center column
*/

-- Add the center PostGIS column to communities table
ALTER TABLE communities 
  ADD COLUMN center geometry(Point, 4326) NOT NULL;

-- Create spatial index for the center column
CREATE INDEX communities_center_idx ON communities USING gist(center);