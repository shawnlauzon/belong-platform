-- Fix for resource offer trust points not being awarded
-- The original trigger on resources table fires before resource_communities associations exist
-- This adds a trigger on resource_communities to award points when associations are created

-- Create a new trigger function for resource_communities insert
CREATE OR REPLACE FUNCTION trust_score_on_resource_community_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_resource RECORD;
BEGIN
  -- Get resource details
  SELECT type, owner_id, title
  INTO v_resource
  FROM resources
  WHERE id = NEW.resource_id;

  -- Only process offers
  IF v_resource.type != 'offer' THEN
    RETURN NEW;
  END IF;

  -- Award points for this community association
  PERFORM update_trust_score(
    v_resource.owner_id,
    NEW.community_id,
    'resource_offer'::trust_score_action_type,
    NEW.resource_id,
    50,
    jsonb_build_object(
      'trigger', 'resource_community_insert',
      'resource_type', v_resource.type,
      'resource_title', v_resource.title
    )
  );

  RETURN NEW;
END;
$$;

-- Create trigger on resource_communities table
CREATE TRIGGER trust_score_on_resource_community_insert_trigger
  AFTER INSERT ON resource_communities
  FOR EACH ROW
  EXECUTE FUNCTION trust_score_on_resource_community_insert();

-- Drop the old trigger that doesn't work properly
DROP TRIGGER IF EXISTS trust_score_on_resource_insert_trigger ON resources;

-- Drop the old function as it's no longer needed
DROP FUNCTION IF EXISTS trust_score_on_resource_insert();

-- Add helpful comment
COMMENT ON TRIGGER trust_score_on_resource_community_insert_trigger ON resource_communities 
IS 'Awards trust score points when resource offers are associated with communities';