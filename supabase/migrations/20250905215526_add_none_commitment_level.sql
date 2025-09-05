-- Add 'none' to commitment_level_enum to indicate no interest
-- and update notification functions to exclude 'none' commitment level from notifications
BEGIN;

-- Add 'none' value to the commitment_level_enum
ALTER TYPE commitment_level_enum ADD VALUE 'none';

-- Update notify_on_resource_update function to exclude 'none' commitment level
CREATE OR REPLACE FUNCTION notify_on_resource_update()
RETURNS TRIGGER AS $$
DECLARE
  claim_record RECORD;
  resource_community_id UUID;
BEGIN
  -- Only notify if specific fields changed
  IF OLD.title = NEW.title 
     AND OLD.description = NEW.description
     AND OLD.location_name IS NOT DISTINCT FROM NEW.location_name THEN
    RETURN NEW;
  END IF;
  
  -- Get community if resource is in one
  SELECT community_id INTO resource_community_id
  FROM resource_communities
  WHERE resource_id = NEW.id
  LIMIT 1;
  
  -- Notify all active claimants (not cancelled, rejected, or 'none' commitment level) about resource update
  FOR claim_record IN 
    SELECT id, claimant_id 
    FROM resource_claims 
    WHERE resource_id = NEW.id 
      AND status NOT IN ('cancelled', 'rejected')
      AND (commitment_level IS NULL OR commitment_level != 'none')
      AND claimant_id != NEW.owner_id
  LOOP
    PERFORM notify_resource_updated(
      claim_record.claimant_id,
      NEW.owner_id,
      NEW.id,
      claim_record.id,
      resource_community_id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update notify_on_resource_cancellation function to exclude 'none' commitment level
CREATE OR REPLACE FUNCTION notify_on_resource_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  claim_record RECORD;
  resource_community_id UUID;
BEGIN
  -- Only proceed if status changed to cancelled
  IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
    -- Get community if resource is in one
    SELECT community_id INTO resource_community_id
    FROM resource_communities
    WHERE resource_id = NEW.id
    LIMIT 1;
    
    -- Notify all approved claimants (excluding 'none' commitment level)
    FOR claim_record IN 
      SELECT claimant_id 
      FROM resource_claims 
      WHERE resource_id = NEW.id 
        AND status = 'approved'
        AND (commitment_level IS NULL OR commitment_level != 'none')
        AND claimant_id != NEW.owner_id
    LOOP
      PERFORM notify_resource_cancelled(
        claim_record.claimant_id,
        NEW.owner_id,
        NEW.id,
        resource_community_id
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMIT;