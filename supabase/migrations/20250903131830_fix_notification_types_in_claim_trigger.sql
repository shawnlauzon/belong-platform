-- Fix notification types in claim status change trigger
-- The trigger was using 'resource_given' and 'resource_received' which are not valid notification types
-- Replace them with 'claimed_resource_updated' which is in the allowed list

CREATE OR REPLACE FUNCTION notify_on_claim_status_change()
RETURNS TRIGGER AS $$
DECLARE
  claimant_name TEXT;
  resource_owner_name TEXT;
  resource_title TEXT;
  resource_owner_id UUID;
BEGIN
  -- Only process if status actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get names and resource info
  SELECT COALESCE(full_name, first_name || ' ' || last_name, 'Someone') INTO claimant_name
  FROM public_profiles WHERE id = NEW.claimant_id;
  
  SELECT owner_id, title INTO resource_owner_id, resource_title
  FROM resources WHERE id = NEW.resource_id;
  
  SELECT COALESCE(full_name, first_name || ' ' || last_name, 'Someone') INTO resource_owner_name
  FROM public_profiles WHERE id = resource_owner_id;
  
  -- Handle different status changes
  CASE NEW.status
    WHEN 'cancelled' THEN
      -- Notify resource owner that claim was cancelled
      PERFORM create_or_update_notification(
        resource_owner_id,
        'resource_claim_cancelled',
        NEW.claimant_id,
        'claim_cancelled:' || NEW.resource_id::text,
        claimant_name || ' cancelled their claim on ' || LOWER(resource_title),
        NULL,
        '/resources/' || NEW.resource_id::text,
        NEW.resource_id, NULL, NEW.id, NULL, NULL, NULL,
        jsonb_build_object('resource_title', resource_title, 'claim_status', NEW.status)
      );
    
    WHEN 'completed' THEN
      -- Notify resource owner that claim was completed
      PERFORM create_or_update_notification(
        resource_owner_id,
        'resource_claim_completed',
        NEW.claimant_id,
        'claim_completed:' || NEW.resource_id::text,
        claimant_name || ' completed ' || LOWER(resource_title),
        NEW.notes,
        '/resources/' || NEW.resource_id::text,
        NEW.resource_id, NULL, NEW.id, NULL, NULL, NULL,
        jsonb_build_object('resource_title', resource_title, 'claim_status', NEW.status)
      );
    
    WHEN 'approved' THEN
      -- Notify claimant that their claim was approved
      PERFORM create_or_update_notification(
        NEW.claimant_id,
        'claim_approved',
        resource_owner_id,
        'claim_approved:' || NEW.id::text,
        resource_owner_name || ' approved your claim for ' || LOWER(resource_title),
        NULL,
        '/resources/' || NEW.resource_id::text,
        NEW.resource_id, NULL, NEW.id, NULL, NULL, NULL,
        jsonb_build_object('resource_title', resource_title, 'claim_status', NEW.status)
      );
    
    WHEN 'rejected' THEN
      -- Notify claimant that their claim was rejected
      PERFORM create_or_update_notification(
        NEW.claimant_id,
        'claim_rejected',
        resource_owner_id,
        'claim_rejected:' || NEW.id::text,
        resource_owner_name || ' declined your claim for ' || LOWER(resource_title),
        NULL,
        '/resources/' || NEW.resource_id::text,
        NEW.resource_id, NULL, NEW.id, NULL, NULL, NULL,
        jsonb_build_object('resource_title', resource_title, 'claim_status', NEW.status)
      );
    
    WHEN 'given' THEN
      -- Notify claimant that resource has been marked as given
      -- Use 'claimed_resource_updated' instead of invalid 'resource_given'
      PERFORM create_or_update_notification(
        NEW.claimant_id,
        'claimed_resource_updated',
        resource_owner_id,
        'resource_given:' || NEW.id::text,
        resource_owner_name || ' marked ' || LOWER(resource_title) || ' as given',
        NULL,
        '/resources/' || NEW.resource_id::text,
        NEW.resource_id, NULL, NEW.id, NULL, NULL, NULL,
        jsonb_build_object('resource_title', resource_title, 'claim_status', NEW.status)
      );
    
    WHEN 'received' THEN
      -- Notify resource owner that resource has been marked as received
      -- Use 'claimed_resource_updated' instead of invalid 'resource_received'
      PERFORM create_or_update_notification(
        resource_owner_id,
        'claimed_resource_updated',
        NEW.claimant_id,
        'resource_received:' || NEW.id::text,
        claimant_name || ' marked ' || LOWER(resource_title) || ' as received',
        NULL,
        '/resources/' || NEW.resource_id::text,
        NEW.resource_id, NULL, NEW.id, NULL, NULL, NULL,
        jsonb_build_object('resource_title', resource_title, 'claim_status', NEW.status)
      );
    
    ELSE
      -- Do nothing for other status changes (interested, going, attended, flaked, pending)
      NULL;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;