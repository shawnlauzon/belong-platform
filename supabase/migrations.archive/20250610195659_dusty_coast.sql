/*
  # Synchronize existing member counts

  1. Data Synchronization
    - Updates all existing communities to have accurate member_counts
    - Counts actual memberships from community_memberships table
    - Handles communities with no memberships (sets to 0)

  2. One-time Operation
    - This migration ensures existing data is consistent
    - Future changes will be handled automatically by triggers
*/

-- Update all existing communities to have accurate member counts
UPDATE communities
SET member_count = (
  SELECT COUNT(*)
  FROM community_memberships cm
  WHERE cm.community_id = communities.id
),
updated_at = now()
WHERE TRUE;

-- Log the synchronization for debugging
DO $$
DECLARE
  total_communities integer;
  communities_updated integer;
BEGIN
  -- Count total communities
  SELECT COUNT(*) INTO total_communities FROM communities;
  
  -- Count communities that were updated (this will be all of them)
  SELECT COUNT(*) INTO communities_updated FROM communities;
  
  -- Log the results
  RAISE NOTICE 'Member count synchronization complete: % communities updated out of % total', 
    communities_updated, total_communities;
END $$;