-- Fix trust score enum casting issues
-- The trust score functions are being called with text literals but expect enum types

-- Fix trust_score_on_membership_insert function
CREATE OR REPLACE FUNCTION "public"."trust_score_on_membership_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  PERFORM update_trust_score(
    NEW.user_id,
    NEW.community_id,
    'community_join'::trust_score_action_type, -- Cast text to enum
    NEW.community_id,
    50,
    jsonb_build_object('trigger', 'community_membership_insert')
  );
  RETURN NEW;
END;
$$;

-- Fix trust_score_on_resource_insert function  
CREATE OR REPLACE FUNCTION "public"."trust_score_on_resource_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_community_id UUID;
BEGIN
  -- Only process offers
  IF NEW.type != 'offer' THEN
    RETURN NEW;
  END IF;

  -- Award points for each community the resource is associated with
  FOR v_community_id IN
    SELECT community_id 
    FROM resource_communities 
    WHERE resource_id = NEW.id
  LOOP
    PERFORM update_trust_score(
      NEW.owner_id,
      v_community_id,
      'resource_offer'::trust_score_action_type, -- Cast text to enum
      NEW.id,
      50,
      jsonb_build_object(
        'trigger', 'resource_insert',
        'resource_type', NEW.type,
        'resource_title', NEW.title
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Fix trust_score_on_shoutout_insert function
CREATE OR REPLACE FUNCTION "public"."trust_score_on_shoutout_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Award points to receiver
  PERFORM update_trust_score(
    NEW.receiver_id,
    NEW.community_id,
    'shoutout_received'::trust_score_action_type, -- Cast text to enum
    NEW.id,
    100,
    jsonb_build_object(
      'trigger', 'shoutout_insert',
      'role', 'receiver',
      'sender_id', NEW.sender_id
    )
  );

  -- Award points to sender  
  PERFORM update_trust_score(
    NEW.sender_id,
    NEW.community_id,
    'shoutout_sent'::trust_score_action_type, -- Cast text to enum
    NEW.id,
    10,
    jsonb_build_object(
      'trigger', 'shoutout_insert',
      'role', 'sender',
      'receiver_id', NEW.receiver_id
    )
  );

  RETURN NEW;
END;
$$;

-- Fix trust_score_on_claim_insert function
CREATE OR REPLACE FUNCTION "public"."trust_score_on_claim_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
      NEW.user_id,
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
$$;

-- Fix trust_score_on_claim_update function
CREATE OR REPLACE FUNCTION "public"."trust_score_on_claim_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
      NEW.user_id,
      v_community_id,
      v_action_type::trust_score_action_type, -- Cast text to enum
      NEW.id,
      v_points,
      v_metadata
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Add comments documenting the fixes
COMMENT ON FUNCTION "public"."trust_score_on_membership_insert"() IS 'Awards trust points when user joins community. Fixed enum casting for action_type parameter.';
COMMENT ON FUNCTION "public"."trust_score_on_resource_insert"() IS 'Awards trust points when user creates resource offer. Fixed enum casting for action_type parameter.';
COMMENT ON FUNCTION "public"."trust_score_on_shoutout_insert"() IS 'Awards trust points for sending and receiving shoutouts. Fixed enum casting for action_type parameter.';
COMMENT ON FUNCTION "public"."trust_score_on_claim_insert"() IS 'Awards trust points when user claims event timeslot. Fixed enum casting for action_type parameter.';
COMMENT ON FUNCTION "public"."trust_score_on_claim_update"() IS 'Awards trust points when event claim status changes. Fixed enum casting for action_type parameter.';