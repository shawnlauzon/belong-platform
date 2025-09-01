-- Fix resource claim state transitions for proper event registration handling
-- This addresses multiple issues:
-- 1. Event attendees cannot transition from "interested" to "going" 
-- 2. Event owners cannot mark attendance as "attended" or "flaked"
-- 3. Event registrations should allow cancellation with time-based rules

-- ============================================================================
-- Fix RLS policies for proper role-based permissions
-- ============================================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Claim users can manage their claim status" ON resource_claims;
DROP POLICY IF EXISTS "Resource owners can manage workflow states except cancelled" ON resource_claims;

-- Create updated claimant policy that allows proper state transitions
CREATE POLICY "Claim users can manage their claim status" ON resource_claims
FOR UPDATE
USING (auth.uid() = claimant_id)
WITH CHECK (
  auth.uid() = claimant_id 
  AND (
    -- Allow claimants to set these statuses directly
    status IN ('pending', 'cancelled', 'interested', 'going', 'received', 'given', 'completed')
    OR (
      -- Special case for approved status when no approval required
      status = 'approved' 
      AND EXISTS (
        SELECT 1 FROM resources 
        WHERE id = resource_claims.resource_id 
        AND requires_approval = false
      )
    )
  )
);

-- Create updated resource owner policy that includes event attendance statuses
CREATE POLICY "Resource owners can manage workflow states except cancelled" ON resource_claims
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT resources.owner_id
    FROM resources
    WHERE resources.id = resource_claims.resource_id
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT resources.owner_id
    FROM resources
    WHERE resources.id = resource_claims.resource_id
  ) 
  AND status IN ('pending', 'approved', 'rejected', 'completed', 'attended', 'flaked', 'interested', 'given', 'received')
);

-- ============================================================================
-- Update trigger function for time-based event validation
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
  v_event_end_time TIMESTAMP WITH TIME ZONE;
  v_event_completed BOOLEAN;
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

  -- For events, get the event completion status
  IF v_resource.type = 'event' THEN
    -- Get the latest end time from all timeslots for this resource
    SELECT MAX(rt.end_time) INTO v_event_end_time
    FROM resource_timeslots rt
    WHERE rt.resource_id = NEW.resource_id;
    
    -- Event is completed if the latest timeslot has ended
    v_event_completed := (v_event_end_time IS NOT NULL AND v_event_end_time < NOW());
  END IF;

  -- ============================================================================
  -- CANCELLATION RULES
  -- ============================================================================
  
  IF NEW.status = 'cancelled' THEN
    -- Only claimant can cancel
    IF NOT v_is_claimant THEN
      RAISE EXCEPTION 'Only the claimant can cancel a claim';
    END IF;
    
    -- Cannot cancel from rejected or completed state
    IF OLD.status IN ('rejected', 'completed') THEN
      RAISE EXCEPTION 'Cannot cancel a claim that is already % status', OLD.status;
    END IF;
    
    -- For events, cannot cancel from attended or flaked states
    IF v_resource.type = 'event' AND OLD.status IN ('attended', 'flaked') THEN
      RAISE EXCEPTION 'Cannot cancel an event registration that is already %', OLD.status;
    END IF;
    
    -- For events, can only cancel BEFORE the event completes
    IF v_resource.type = 'event' AND v_event_completed THEN
      RAISE EXCEPTION 'Cannot cancel event registration after the event has completed';
    END IF;
    
    -- Cancellation is allowed
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
          
          -- Can only mark attendance AFTER the event has completed
          IF NOT v_event_completed THEN
            RAISE EXCEPTION 'Cannot mark attendance before the event has completed';
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