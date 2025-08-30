-- Fix trust score trigger functions to use correct column name
-- The resource_claims table has 'claimant_id' not 'user_id'

CREATE OR REPLACE FUNCTION public.trust_score_on_claim_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_resource RECORD;
  v_community_id UUID;
BEGIN
  -- Only process if status is 'pending' (for events)
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Get resource details
  SELECT r.type, r.owner_id, r.title 
  INTO v_resource
  FROM resources r
  JOIN resource_timeslots rt ON rt.resource_id = r.id
  WHERE rt.id = NEW.timeslot_id;

  -- Only process events (resources with type 'event')
  IF v_resource.type != 'event' THEN
    RETURN NEW;
  END IF;

  -- Award points for each community the resource is associated with
  FOR v_community_id IN
    SELECT rc.community_id 
    FROM resource_communities rc
    JOIN resource_timeslots rt ON rt.resource_id = rc.resource_id
    WHERE rt.id = NEW.timeslot_id
  LOOP
    PERFORM update_trust_score(
      NEW.claimant_id,
      v_community_id,
      'resource_claim'::trust_score_action_type, -- Cast text to enum
      NEW.id,
      5,
      jsonb_build_object(
        'trigger', 'resource_claim_insert',
        'resource_type', v_resource.type,
        'resource_title', v_resource.title,
        'status', NEW.status
      )
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trust_score_on_claim_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_resource RECORD;
  v_community_id UUID;
  v_points INTEGER;
  v_action_type TEXT;
  v_metadata JSONB;
BEGIN
  -- Get resource details
  SELECT r.type, r.owner_id, r.title 
  INTO v_resource
  FROM resources r
  JOIN resource_timeslots rt ON rt.resource_id = r.id
  WHERE rt.id = NEW.timeslot_id;

  -- Only process events (resources with type 'event')
  IF v_resource.type != 'event' THEN
    RETURN NEW;
  END IF;

  -- Determine action based on status change
  IF OLD.status = 'pending' AND NEW.status = 'confirmed' THEN
    v_action_type := 'resource_claim';
    v_points := 25;
    v_metadata := jsonb_build_object(
      'trigger', 'resource_claim_update',
      'resource_type', v_resource.type,
      'resource_title', v_resource.title,
      'old_status', OLD.status,
      'new_status', NEW.status
    );
  ELSIF OLD.status = 'confirmed' AND NEW.status = 'completed' THEN
    v_action_type := 'resource_completion';
    v_points := 50;
    v_metadata := jsonb_build_object(
      'trigger', 'resource_claim_update',
      'resource_type', v_resource.type,
      'resource_title', v_resource.title,
      'old_status', OLD.status,
      'new_status', NEW.status
    );
  ELSE
    -- No points awarded for other status changes
    RETURN NEW;
  END IF;

  -- Award points for each community the resource is associated with
  FOR v_community_id IN
    SELECT rc.community_id 
    FROM resource_communities rc
    JOIN resource_timeslots rt ON rt.resource_id = rc.resource_id
    WHERE rt.id = NEW.timeslot_id
  LOOP
    PERFORM update_trust_score(
      NEW.claimant_id,
      v_community_id,
      v_action_type::trust_score_action_type, -- Cast text to enum
      NEW.id,
      v_points,
      v_metadata
    );
  END LOOP;

  RETURN NEW;
END;
$function$;