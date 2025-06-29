/*
  # Add missing fields to communities table

  This migration adds the missing fields that are expected by the application
  but are not present in the current database schema:
  
  1. icon (text, nullable) - Visual icon for community
  2. organizer_id (uuid, references auth.users) - Rename from creator_id
  3. hierarchy_path (jsonb) - Store community hierarchy path
  4. time_zone (text) - Community timezone
  5. is_active (boolean) - Soft delete flag
  6. deleted_at (timestamptz) - Soft delete timestamp
  7. deleted_by (uuid) - User who deleted the community
*/

-- Add the new fields to communities table
ALTER TABLE communities 
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS hierarchy_path jsonb DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS time_zone text DEFAULT 'UTC' NOT NULL,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Rename creator_id to organizer_id if it exists
DO $$
BEGIN
  -- Check if creator_id exists and organizer_id doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'communities' 
    AND column_name = 'creator_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'communities' 
    AND column_name = 'organizer_id'
  ) THEN
    ALTER TABLE communities RENAME COLUMN creator_id TO organizer_id;
  END IF;
END $$;

-- Add organizer_id if it doesn't exist (fallback)
ALTER TABLE communities 
  ADD COLUMN IF NOT EXISTS organizer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update existing communities to have proper hierarchy paths
-- This is a simplified version - in a real scenario, you'd need to properly compute the hierarchy
UPDATE communities 
SET hierarchy_path = CASE 
  WHEN level = 'global' THEN '[]'::jsonb
  WHEN level = 'country' THEN '[{"level": "global", "name": "Worldwide"}]'::jsonb
  WHEN level = 'city' THEN (
    SELECT jsonb_build_array(
      jsonb_build_object('level', 'global', 'name', 'Worldwide'),
      jsonb_build_object('level', 'country', 'name', p.name)
    )
    FROM communities p WHERE p.id = communities.parent_id
  )
  WHEN level = 'neighborhood' THEN (
    SELECT jsonb_build_array(
      jsonb_build_object('level', 'global', 'name', 'Worldwide'),
      jsonb_build_object('level', 'country', 'name', gp.name),
      jsonb_build_object('level', 'city', 'name', p.name)
    )
    FROM communities p 
    JOIN communities gp ON p.parent_id = gp.id
    WHERE p.id = communities.parent_id
  )
  ELSE '[]'::jsonb
END
WHERE hierarchy_path = '[]'::jsonb;

-- Update existing communities to have proper timezones based on location
UPDATE communities 
SET time_zone = CASE 
  WHEN name = 'Austin' OR name = 'South Austin' THEN 'America/Chicago'
  WHEN name = 'Guildford' THEN 'Europe/London'
  WHEN name = 'United States' THEN 'America/New_York'
  WHEN name = 'England' THEN 'Europe/London'
  ELSE 'UTC'
END
WHERE time_zone = 'UTC';

-- Update RLS policies to use organizer_id instead of creator_id
DO $$
BEGIN
  -- Drop old policies if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'communities' AND policyname = 'Authenticated users can create communities') THEN
    DROP POLICY "Authenticated users can create communities" ON communities;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'communities' AND policyname = 'Creators can update their communities') THEN
    DROP POLICY "Creators can update their communities" ON communities;
  END IF;

  -- Recreate policies with organizer_id
  CREATE POLICY "Authenticated users can create communities"
    ON communities
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = organizer_id);

  CREATE POLICY "Organizers can update their communities"
    ON communities
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = organizer_id AND is_active = true)
    WITH CHECK (auth.uid() = organizer_id);

  -- Add policy for soft delete
  CREATE POLICY "Organizers can delete their communities"
    ON communities
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = organizer_id)
    WITH CHECK (auth.uid() = organizer_id);
END $$;

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS communities_organizer_id_idx ON communities(organizer_id);  
CREATE INDEX IF NOT EXISTS communities_is_active_idx ON communities(is_active);
CREATE INDEX IF NOT EXISTS communities_deleted_at_idx ON communities(deleted_at);
CREATE INDEX IF NOT EXISTS communities_time_zone_idx ON communities(time_zone);

-- Create index for hierarchy_path using GIN for JSONB queries
CREATE INDEX IF NOT EXISTS communities_hierarchy_path_idx ON communities USING gin(hierarchy_path);