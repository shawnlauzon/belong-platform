-- Restore the 'received' status to the resource_claim_status enum
-- This was incorrectly removed in the previous migration

-- Add 'received' status back to the enum
ALTER TYPE resource_claim_status ADD VALUE 'received';

-- Update validation function to support received status transitions
CREATE OR REPLACE FUNCTION validate_claim_state_transition()
RETURNS TRIGGER AS $$
DECLARE
  resource_record RECORD;
  user_is_owner BOOLEAN := FALSE;
  user_is_claimant BOOLEAN := FALSE;
BEGIN
  -- Get resource information
  SELECT r.type, r.requires_approval, r.owner_id
  INTO resource_record
  FROM resources r
  WHERE r.id = NEW.resource_id;

  -- Determine user role
  user_is_owner := (auth.uid() = resource_record.owner_id);
  user_is_claimant := (auth.uid() = NEW.claimant_id);

  -- If only commitment_level changed, allow it for claimants on approved claims
  IF OLD.status = NEW.status AND OLD.commitment_level != NEW.commitment_level THEN
    IF NOT user_is_claimant THEN
      RAISE EXCEPTION 'Only the claimant can update their commitment level';
    END IF;
    
    -- Don't allow commitment level changes on terminal states
    IF NEW.status IN ('rejected', 'completed', 'cancelled', 'attended', 'flaked') THEN
      RAISE EXCEPTION 'Cannot change commitment level on % claims', NEW.status;
    END IF;
    
    RETURN NEW;
  END IF;

  -- Validate initial states
  IF TG_OP = 'INSERT' THEN
    IF resource_record.type = 'event' THEN
      IF resource_record.requires_approval AND NEW.status != 'pending' THEN
        RAISE EXCEPTION 'New event registrations requiring approval must start with pending status';
      ELSIF NOT resource_record.requires_approval AND NEW.status != 'approved' THEN
        RAISE EXCEPTION 'New event registrations not requiring approval must start with approved status';
      END IF;
    ELSE
      IF resource_record.requires_approval AND NEW.status != 'pending' THEN
        RAISE EXCEPTION 'New % claims requiring approval must start with pending status', resource_record.type;
      ELSIF NOT resource_record.requires_approval AND NEW.status != 'approved' THEN
        RAISE EXCEPTION 'New % claims not requiring approval must start with approved status', resource_record.type;
      END IF;
    END IF;
    
    RETURN NEW;
  END IF;

  -- Terminal states cannot be changed
  IF OLD.status IN ('rejected', 'completed', 'cancelled', 'attended', 'flaked') THEN
    RAISE EXCEPTION 'Cannot transition from % status', OLD.status;
  END IF;

  -- Only owner can approve, reject
  IF NEW.status IN ('approved', 'rejected') THEN
    IF NOT user_is_owner THEN
      RAISE EXCEPTION 'Only resource owner can approve or reject claims';
    END IF;
    IF OLD.status != 'pending' THEN
      RAISE EXCEPTION 'Can only approve or reject pending claims';
    END IF;
  END IF;

  -- Resource type specific validations
  IF resource_record.type = 'event' THEN
    -- Event-specific transitions (includes flaked status)
    CASE 
      WHEN OLD.status = 'approved' AND NEW.status = 'going' THEN
        IF NOT user_is_claimant THEN
          RAISE EXCEPTION 'Only the attendee can confirm they are going';
        END IF;
      WHEN OLD.status = 'going' AND NEW.status IN ('attended', 'flaked') THEN
        IF NOT user_is_owner THEN
          RAISE EXCEPTION 'Only event owner can mark attendance or flaked';
        END IF;
      WHEN NEW.status = 'cancelled' THEN
        IF NOT user_is_claimant THEN
          RAISE EXCEPTION 'Only the attendee can cancel their registration';
        END IF;
      ELSE
        -- Check for invalid transitions (includes flaked)
        IF NOT (
          (OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected')) OR
          (OLD.status = 'approved' AND NEW.status IN ('going', 'cancelled')) OR
          (OLD.status = 'going' AND NEW.status IN ('attended', 'flaked', 'cancelled'))
        ) THEN
          RAISE EXCEPTION 'Invalid status transition for event: % -> %', OLD.status, NEW.status;
        END IF;
    END CASE;
    
  ELSIF resource_record.type = 'offer' THEN
    -- Offer-specific transitions (restored 'received' status)
    CASE
      WHEN OLD.status = 'approved' AND NEW.status = 'given' THEN
        IF NOT user_is_owner THEN
          RAISE EXCEPTION 'Only resource owner can mark an offer as given';
        END IF;
      WHEN OLD.status = 'approved' AND NEW.status = 'received' THEN
        IF NOT user_is_claimant THEN
          RAISE EXCEPTION 'Only claimant can mark an offer as received';
        END IF;
      WHEN OLD.status = 'given' AND NEW.status = 'completed' THEN
        IF NOT user_is_claimant THEN
          RAISE EXCEPTION 'Only claimant can complete a given offer';
        END IF;
      WHEN OLD.status = 'received' AND NEW.status = 'completed' THEN
        IF NOT user_is_owner THEN
          RAISE EXCEPTION 'Only owner can complete a received offer';
        END IF;
      WHEN NEW.status = 'cancelled' THEN
        IF NOT user_is_claimant THEN
          RAISE EXCEPTION 'Only claimant can cancel their claim';
        END IF;
      ELSE
        -- Check for invalid transitions (restored 'received' status)
        IF NOT (
          (OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected')) OR
          (OLD.status = 'approved' AND NEW.status IN ('given', 'received', 'cancelled')) OR
          (OLD.status = 'given' AND NEW.status = 'completed') OR
          (OLD.status = 'received' AND NEW.status = 'completed')
        ) THEN
          RAISE EXCEPTION 'Invalid status transition for offer: % -> %', OLD.status, NEW.status;
        END IF;
    END CASE;
    
  ELSIF resource_record.type = 'request' THEN
    -- Request-specific transitions (restored 'received' status)
    CASE
      WHEN OLD.status = 'approved' AND NEW.status = 'given' THEN
        IF NOT user_is_claimant THEN
          RAISE EXCEPTION 'Only claimant can mark a request as given';
        END IF;
      WHEN OLD.status = 'approved' AND NEW.status = 'received' THEN
        IF NOT user_is_owner THEN
          RAISE EXCEPTION 'Only owner can mark a request as received';
        END IF;
      WHEN OLD.status = 'given' AND NEW.status = 'completed' THEN
        IF NOT user_is_owner THEN
          RAISE EXCEPTION 'Only owner can complete a given request';
        END IF;
      WHEN OLD.status = 'received' AND NEW.status = 'completed' THEN
        IF NOT user_is_claimant THEN
          RAISE EXCEPTION 'Only claimant can complete a received request';
        END IF;
      WHEN NEW.status = 'cancelled' THEN
        IF NOT user_is_claimant THEN
          RAISE EXCEPTION 'Only claimant can cancel their claim';
        END IF;
      ELSE
        -- Check for invalid transitions (restored 'received' status)
        IF NOT (
          (OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected')) OR
          (OLD.status = 'approved' AND NEW.status IN ('given', 'received', 'cancelled')) OR
          (OLD.status = 'given' AND NEW.status = 'completed') OR
          (OLD.status = 'received' AND NEW.status = 'completed')
        ) THEN
          RAISE EXCEPTION 'Invalid status transition for request: % -> %', OLD.status, NEW.status;
        END IF;
    END CASE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trust score function to handle received status
CREATE OR REPLACE FUNCTION trust_score_on_claim_update()
RETURNS TRIGGER AS $$
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
    -- Events have different states (no more 'interested' status)
    IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
      v_action_type := 'resource_claim';
      v_points := 5;
    ELSIF OLD.status = 'approved' AND NEW.status = 'going' THEN
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
    -- Offers and Requests (restored 'received' status)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;