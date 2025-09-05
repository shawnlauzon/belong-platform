-- Fix notification system issues
-- 1. Add 'interested' status handling for event approval notifications
-- 2. Fix resource update notifications to include all active claim statuses

-- Update claim status change notification function to handle 'interested' status for events
CREATE OR REPLACE FUNCTION notify_on_claim_status_change()
RETURNS TRIGGER AS $$
DECLARE
  resource_owner_id UUID;
  resource_community_id UUID;
BEGIN
  -- Only proceed if status actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get resource owner
  SELECT owner_id INTO resource_owner_id
  FROM resources
  WHERE id = NEW.resource_id;
  
  -- Get community if resource is in one
  SELECT community_id INTO resource_community_id
  FROM resource_communities
  WHERE resource_id = NEW.resource_id
  LIMIT 1;
  
  -- Handle different status changes
  CASE NEW.status
    WHEN 'approved' THEN
      -- Notify claimant their claim was approved
      PERFORM notify_claim_approved(
        NEW.claimant_id,
        resource_owner_id,
        NEW.resource_id,
        NEW.id,
        resource_community_id
      );
      
    WHEN 'interested' THEN
      -- For events, 'interested' is the approval status - notify like an approval
      PERFORM notify_claim_approved(
        NEW.claimant_id,
        resource_owner_id,
        NEW.resource_id,
        NEW.id,
        resource_community_id
      );
      
    WHEN 'rejected' THEN
      -- Notify claimant their claim was rejected
      PERFORM notify_claim_rejected(
        NEW.claimant_id,
        resource_owner_id,
        NEW.resource_id,
        NEW.id,
        resource_community_id
      );
      
    WHEN 'completed' THEN
      -- Notify resource owner the claim was completed
      IF resource_owner_id != NEW.claimant_id THEN
        PERFORM notify_claim_completed(
          resource_owner_id,
          NEW.claimant_id,
          NEW.resource_id,
          NEW.id,
          resource_community_id
        );
      END IF;
      
    WHEN 'cancelled' THEN
      -- Notify resource owner the claim was cancelled
      IF resource_owner_id != NEW.claimant_id THEN
        PERFORM notify_claim_cancelled(
          resource_owner_id,
          NEW.claimant_id,
          NEW.resource_id,
          NEW.id,
          resource_community_id
        );
      END IF;
      
    ELSE
      -- Do nothing for other statuses
      NULL;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix resource update notifications to notify claimants with any active status
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
  
  -- Notify all active claimants (not cancelled or rejected) about resource update
  FOR claim_record IN 
    SELECT id, claimant_id 
    FROM resource_claims 
    WHERE resource_id = NEW.id 
      AND status NOT IN ('cancelled', 'rejected')
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