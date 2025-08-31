-- Resource Claim State Transitions Migration
-- This migration implements a comprehensive state transition system for resource claims
-- that enforces business rules at the database level.

-- ============================================================================
-- STEP 1: Add missing enum values for events
-- ============================================================================

-- Add 'going' state for events (after 'given')
ALTER TYPE resource_claim_status ADD VALUE 'going' AFTER 'given';

-- Add 'attended' state for events (after 'going')
ALTER TYPE resource_claim_status ADD VALUE 'attended' AFTER 'going';

-- ============================================================================
-- STEP 2: Create state validation function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_claim_state_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_resource RECORD;
  v_current_user_id UUID;
  v_is_owner BOOLEAN;
  v_is_claimant BOOLEAN;
  v_error_message TEXT;
BEGIN
  -- Skip validation on insert (initial state is set by API)
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Get current user
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required for state transitions';
  END IF;

  -- Get resource details
  SELECT r.type, r.owner_id, r.requires_approval, r.title
  INTO v_resource
  FROM resources r
  WHERE r.id = NEW.resource_id;

  IF v_resource IS NULL THEN
    RAISE EXCEPTION 'Resource not found';
  END IF;

  -- Determine user role
  v_is_owner := (v_current_user_id = v_resource.owner_id);
  v_is_claimant := (v_current_user_id = NEW.claimant_id);

  -- Validate user is either owner or claimant
  IF NOT v_is_owner AND NOT v_is_claimant THEN
    RAISE EXCEPTION 'Only resource owner or claimant can update claim status';
  END IF;

  -- Skip if status hasn't changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- ============================================================================
  -- CANCELLATION RULES (applies to all resource types except events)
  -- ============================================================================
  
  IF NEW.status = 'cancelled' THEN
    -- Events cannot be cancelled
    IF v_resource.type = 'event' THEN
      RAISE EXCEPTION 'Event registrations cannot be cancelled. Please contact the event organizer.';
    END IF;
    
    -- Only claimant can cancel
    IF NOT v_is_claimant THEN
      RAISE EXCEPTION 'Only the claimant can cancel a claim';
    END IF;
    
    -- Cannot cancel from rejected or completed state
    IF OLD.status IN ('rejected', 'completed') THEN
      RAISE EXCEPTION 'Cannot cancel a claim that is already % status', OLD.status;
    END IF;
    
    -- Cancellation is allowed from any other state
    RETURN NEW;
  END IF;

  -- ============================================================================
  -- STATE TRANSITION RULES BY RESOURCE TYPE
  -- ============================================================================

  CASE v_resource.type
    
    -- ============================================================================
    -- OFFERS: Owner giving something to claimant
    -- ============================================================================
    WHEN 'offer' THEN
      CASE OLD.status
        
        WHEN 'pending' THEN
          -- Only owner can approve or reject
          IF NOT v_is_owner THEN
            RAISE EXCEPTION 'Only resource owner can approve or reject claims';
          END IF;
          
          IF NEW.status NOT IN ('approved', 'rejected') THEN
            RAISE EXCEPTION 'Pending offer claims can only be approved or rejected';
          END IF;
        
        WHEN 'approved' THEN
          -- From approved, can go to given (by owner) or received (by claimant)
          IF NEW.status = 'given' THEN
            IF NOT v_is_owner THEN
              RAISE EXCEPTION 'Only resource owner can mark an offer as given';
            END IF;
          ELSIF NEW.status = 'received' THEN
            IF NOT v_is_claimant THEN
              RAISE EXCEPTION 'Only claimant can mark an offer as received';
            END IF;
          ELSIF NEW.status = 'completed' THEN
            RAISE EXCEPTION 'Cannot skip to completed. Both parties must confirm the exchange (given/received) first.';
          ELSE
            RAISE EXCEPTION 'Approved offer claims can only transition to given or received';
          END IF;
        
        WHEN 'given' THEN
          -- From given, only claimant can complete (confirming receipt)
          IF NEW.status != 'completed' THEN
            RAISE EXCEPTION 'Given offer claims can only be marked as completed';
          END IF;
          
          IF NOT v_is_claimant THEN
            RAISE EXCEPTION 'Only claimant can complete an offer after it has been given';
          END IF;
        
        WHEN 'received' THEN
          -- From received, only owner can complete (confirming given)
          IF NEW.status != 'completed' THEN
            RAISE EXCEPTION 'Received offer claims can only be marked as completed';
          END IF;
          
          IF NOT v_is_owner THEN
            RAISE EXCEPTION 'Only resource owner can complete an offer after it has been received';
          END IF;
        
        WHEN 'rejected', 'completed' THEN
          RAISE EXCEPTION 'Cannot transition from % status', OLD.status;
        
        ELSE
          RAISE EXCEPTION 'Invalid current status: %', OLD.status;
      END CASE;

    -- ============================================================================
    -- REQUESTS: Owner requesting something from claimant
    -- ============================================================================
    WHEN 'request' THEN
      CASE OLD.status
        
        WHEN 'pending' THEN
          -- Only owner can approve or reject
          IF NOT v_is_owner THEN
            RAISE EXCEPTION 'Only resource owner can approve or reject claims';
          END IF;
          
          IF NEW.status NOT IN ('approved', 'rejected') THEN
            RAISE EXCEPTION 'Pending request claims can only be approved or rejected';
          END IF;
        
        WHEN 'approved' THEN
          -- From approved, can go to given (by claimant) or received (by owner)
          IF NEW.status = 'given' THEN
            IF NOT v_is_claimant THEN
              RAISE EXCEPTION 'Only claimant can mark a request as given';
            END IF;
          ELSIF NEW.status = 'received' THEN
            IF NOT v_is_owner THEN
              RAISE EXCEPTION 'Only resource owner can mark a request as received';
            END IF;
          ELSIF NEW.status = 'completed' THEN
            RAISE EXCEPTION 'Cannot skip to completed. Both parties must confirm the exchange (given/received) first.';
          ELSE
            RAISE EXCEPTION 'Approved request claims can only transition to given or received';
          END IF;
        
        WHEN 'given' THEN
          -- From given, only owner can complete (confirming receipt)
          IF NEW.status != 'completed' THEN
            RAISE EXCEPTION 'Given request claims can only be marked as completed';
          END IF;
          
          IF NOT v_is_owner THEN
            RAISE EXCEPTION 'Only resource owner can complete a request after it has been given';
          END IF;
        
        WHEN 'received' THEN
          -- From received, only claimant can complete (confirming given)
          IF NEW.status != 'completed' THEN
            RAISE EXCEPTION 'Received request claims can only be marked as completed';
          END IF;
          
          IF NOT v_is_claimant THEN
            RAISE EXCEPTION 'Only claimant can complete a request after it has been received';
          END IF;
        
        WHEN 'rejected', 'completed' THEN
          RAISE EXCEPTION 'Cannot transition from % status', OLD.status;
        
        ELSE
          RAISE EXCEPTION 'Invalid current status: %', OLD.status;
      END CASE;

    -- ============================================================================
    -- EVENTS: Attendee registering for an event
    -- ============================================================================
    WHEN 'event' THEN
      CASE OLD.status
        
        WHEN 'pending' THEN
          -- Only owner can approve (to interested) or reject
          IF NOT v_is_owner THEN
            RAISE EXCEPTION 'Only event organizer can approve or reject registrations';
          END IF;
          
          IF NEW.status NOT IN ('interested', 'rejected') THEN
            RAISE EXCEPTION 'Pending event registrations can only be approved (interested) or rejected';
          END IF;
        
        WHEN 'interested' THEN
          -- From interested, only claimant can confirm going
          IF NEW.status != 'going' THEN
            RAISE EXCEPTION 'Interested attendees can only confirm as going';
          END IF;
          
          IF NOT v_is_claimant THEN
            RAISE EXCEPTION 'Only the attendee can confirm they are going';
          END IF;
        
        WHEN 'going' THEN
          -- From going, only owner can mark as attended or flaked
          IF NEW.status NOT IN ('attended', 'flaked') THEN
            RAISE EXCEPTION 'Going status can only transition to attended or flaked';
          END IF;
          
          IF NOT v_is_owner THEN
            RAISE EXCEPTION 'Only event organizer can mark attendance';
          END IF;
        
        WHEN 'rejected', 'attended', 'flaked' THEN
          RAISE EXCEPTION 'Cannot transition from % status', OLD.status;
        
        ELSE
          RAISE EXCEPTION 'Invalid current status: %', OLD.status;
      END CASE;

    ELSE
      RAISE EXCEPTION 'Unknown resource type: %', v_resource.type;
  END CASE;

  RETURN NEW;
END;
$function$;

-- ============================================================================
-- STEP 3: Add validation trigger
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS validate_claim_transition_trigger ON resource_claims;

-- Create new trigger
CREATE TRIGGER validate_claim_transition_trigger
BEFORE UPDATE ON resource_claims
FOR EACH ROW
EXECUTE FUNCTION validate_claim_state_transition();

-- ============================================================================
-- STEP 4: Fix trust score triggers
-- ============================================================================

-- Fix the trust_score_on_claim_update function to use correct status values
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

  -- Determine action based on resource type and status change
  IF v_resource.type = 'event' THEN
    -- Events have different states
    IF OLD.status = 'pending' AND NEW.status = 'interested' THEN
      v_action_type := 'resource_claim';
      v_points := 5;
    ELSIF OLD.status = 'interested' AND NEW.status = 'going' THEN
      v_action_type := 'resource_claim';
      v_points := 25;
    ELSIF OLD.status = 'going' AND NEW.status = 'attended' THEN
      v_action_type := 'resource_completion';
      v_points := 50;
    ELSE
      -- No points for other transitions
      RETURN NEW;
    END IF;
  ELSE
    -- Offers and Requests
    IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
      v_action_type := 'resource_claim';
      v_points := 25;
    ELSIF (OLD.status = 'given' OR OLD.status = 'received') AND NEW.status = 'completed' THEN
      v_action_type := 'resource_completion';
      v_points := 50;
    ELSE
      -- No points for other transitions
      RETURN NEW;
    END IF;
  END IF;

  v_metadata := jsonb_build_object(
    'trigger', 'resource_claim_update',
    'resource_type', v_resource.type,
    'resource_title', v_resource.title,
    'old_status', OLD.status,
    'new_status', NEW.status
  );

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
      v_action_type::trust_score_action_type,
      NEW.id,
      v_points,
      v_metadata
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Fix the trust_score_on_claim_insert function for events
CREATE OR REPLACE FUNCTION public.trust_score_on_claim_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_resource RECORD;
  v_community_id UUID;
  v_points INTEGER;
BEGIN
  -- Get resource details
  SELECT r.type, r.owner_id, r.title, r.requires_approval
  INTO v_resource
  FROM resources r
  JOIN resource_timeslots rt ON rt.resource_id = r.id
  WHERE rt.id = NEW.timeslot_id;

  -- Determine points based on initial status
  IF v_resource.type = 'event' THEN
    -- Events that don't require approval start as 'interested' and get 5 points
    IF NEW.status = 'interested' THEN
      v_points := 5;
    ELSE
      -- 'pending' events don't get points until approved
      RETURN NEW;
    END IF;
  ELSE
    -- Offers/Requests that don't require approval start as 'approved' and get 25 points
    IF NEW.status = 'approved' THEN
      v_points := 25;
    ELSE
      -- 'pending' claims don't get points until approved
      RETURN NEW;
    END IF;
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
      'resource_claim'::trust_score_action_type,
      NEW.id,
      v_points,
      jsonb_build_object(
        'trigger', 'resource_claim_insert',
        'resource_type', v_resource.type,
        'resource_title', v_resource.title,
        'status', NEW.status,
        'auto_approved', NOT v_resource.requires_approval
      )
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

-- ============================================================================
-- STEP 5: Add helpful comment
-- ============================================================================

COMMENT ON FUNCTION validate_claim_state_transition() IS 
'Enforces state transition rules for resource claims based on resource type and user role.
Ensures proper two-party handshake for offers/requests and proper flow for events.
Prevents invalid transitions and ensures both parties participate in completion.';