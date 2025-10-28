-- Community Scale Redesign Migration
-- Changes community types from 'interest'/'place' to 'neighbors'/'close'/'far'/'virtual'
-- Makes location fields optional for virtual communities

-- Step 1: Create new PostgreSQL enum type
CREATE TYPE community_type AS ENUM ('neighbors', 'close', 'far', 'virtual');

-- Step 2: Add temporary column with new type
ALTER TABLE communities ADD COLUMN type_new community_type;

-- Step 3: Migrate existing data
-- Map: interest -> close
-- Map: place + westgate-neighbors -> neighbors
-- Map: place (others) -> close
UPDATE communities SET type_new =
  CASE
    WHEN type = 'interest' THEN 'close'::community_type
    WHEN type = 'place' AND name = 'westgate-neighbors' THEN 'neighbors'::community_type
    WHEN type = 'place' THEN 'close'::community_type
    ELSE 'close'::community_type  -- Default fallback
  END;

-- Step 4: Drop old type check constraint
ALTER TABLE communities DROP CONSTRAINT IF EXISTS communities_type_check;

-- Step 5: Drop old type column
ALTER TABLE communities DROP COLUMN type;

-- Step 6: Rename new column to 'type'
ALTER TABLE communities RENAME COLUMN type_new TO type;

-- Step 7: Make type required (no default value)
ALTER TABLE communities ALTER COLUMN type SET NOT NULL;

-- Step 8: Make location fields nullable to support virtual communities
ALTER TABLE communities ALTER COLUMN center DROP NOT NULL;
ALTER TABLE communities ALTER COLUMN time_zone DROP NOT NULL;

-- Step 9: Add check constraint for virtual communities
-- Virtual communities must have NULL location data
-- Non-virtual communities must have location data
ALTER TABLE communities ADD CONSTRAINT communities_virtual_location_check
  CHECK (
    (type = 'virtual' AND center IS NULL AND time_zone IS NULL AND boundary IS NULL AND boundary_geometry IS NULL)
    OR
    (type != 'virtual' AND center IS NOT NULL AND time_zone IS NOT NULL)
  );

-- Step 10: Create function to prevent type changes to/from virtual
CREATE OR REPLACE FUNCTION prevent_virtual_type_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.type = 'virtual' AND NEW.type != 'virtual' THEN
    RAISE EXCEPTION 'Cannot change community type from virtual to non-virtual';
  END IF;
  IF OLD.type != 'virtual' AND NEW.type = 'virtual' THEN
    RAISE EXCEPTION 'Cannot change community type from non-virtual to virtual';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 11: Create trigger to enforce virtual type change restriction
CREATE TRIGGER check_virtual_type_change
  BEFORE UPDATE ON communities
  FOR EACH ROW
  WHEN (OLD.type IS DISTINCT FROM NEW.type)
  EXECUTE FUNCTION prevent_virtual_type_change();

-- Add comment documenting the new scale system
COMMENT ON COLUMN communities.type IS 'Community scale: neighbors (10min), close (20min), far (45min), or virtual (no location)';
