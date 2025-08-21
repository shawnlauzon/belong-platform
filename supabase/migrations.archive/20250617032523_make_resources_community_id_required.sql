-- Make community_id required on resources table
-- First, update any existing NULL values to reference a default community
-- This ensures no data is lost during the migration

-- Check if there are any resources with NULL community_id
DO $$
DECLARE
  null_count integer;
BEGIN
  SELECT COUNT(*) INTO null_count FROM resources WHERE community_id IS NULL;
  
  IF null_count > 0 THEN
    RAISE NOTICE 'Found % resources with NULL community_id. These need to be assigned to a community before making the column NOT NULL.', null_count;
    RAISE EXCEPTION 'Cannot make community_id NOT NULL while there are resources with NULL community_id. Please assign these resources to communities first.';
  END IF;
END $$;

-- Make community_id NOT NULL
ALTER TABLE resources ALTER COLUMN community_id SET NOT NULL;