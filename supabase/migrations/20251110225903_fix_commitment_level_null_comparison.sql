-- Fix NULL comparison bug in validate_claim_state_transition trigger
-- Change from: OLD.commitment_level != NEW.commitment_level
-- To: OLD.commitment_level IS DISTINCT FROM NEW.commitment_level

CREATE OR REPLACE FUNCTION public.validate_claim_state_transition()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  resource_record RECORD;
  user_is_owner BOOLEAN := FALSE;
  user_is_claimant BOOLEAN := FALSE;
  actor_role TEXT;
  is_valid_transition BOOLEAN := FALSE;
BEGIN
  -- Get resource information
  SELECT r.type, r.requires_approval, r.owner_id, r.status as resource_status
  INTO resource_record
  FROM resources r
  WHERE r.id = NEW.resource_id;

  -- Determine user role
  user_is_owner := (auth.uid() = resource_record.owner_id);
  user_is_claimant := (auth.uid() = NEW.claimant_id);

  -- If only commitment_level changed, allow it for claimants on approved claims
  IF OLD.status = NEW.status AND OLD.commitment_level IS DISTINCT FROM NEW.commitment_level THEN
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
    -- Allow 'vote' status for voting events
    IF NEW.status = 'vote' THEN
      IF resource_record.resource_status != 'voting' THEN
        RAISE EXCEPTION 'Vote claims can only be created for voting resources';
      END IF;
      RETURN NEW;
    END IF;

    -- Standard initial status validation
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

  -- Handle vote status transitions (special case, not in rules table)
  IF OLD.status = 'vote' THEN
    -- Vote can transition to: pending, going, cancelled
    IF NEW.status NOT IN ('pending', 'going', 'cancelled') THEN
      RAISE EXCEPTION 'Vote status can only transition to pending, going, or cancelled';
    END IF;

    -- Only claimant can cancel their vote
    IF NEW.status = 'cancelled' AND NOT user_is_claimant THEN
      RAISE EXCEPTION 'Only the claimant can cancel their vote';
    END IF;

    -- Only finalization function can convert to pending/going (done via SECURITY DEFINER)
    RETURN NEW;
  END IF;

  -- Terminal states cannot be changed
  IF OLD.status IN ('rejected', 'completed', 'cancelled', 'attended', 'flaked') THEN
    RAISE EXCEPTION 'Cannot transition from % status', OLD.status;
  END IF;

  -- Determine actor role
  actor_role := CASE
    WHEN user_is_owner THEN 'owner'
    WHEN user_is_claimant THEN 'claimant'
    ELSE 'none'
  END;

  -- Check if transition is valid using rules table
  SELECT EXISTS (
    SELECT 1
    FROM claim_status_transition_rules
    WHERE resource_type = resource_record.type
      AND from_status = OLD.status
      AND to_status = NEW.status
      AND allowed_actor = actor_role
  ) INTO is_valid_transition;

  -- If not valid, raise exception with helpful message
  IF NOT is_valid_transition THEN
    -- Check if transition exists but with wrong actor
    IF EXISTS (
      SELECT 1
      FROM claim_status_transition_rules
      WHERE resource_type = resource_record.type
        AND from_status = OLD.status
        AND to_status = NEW.status
    ) THEN
      RAISE EXCEPTION 'Only the % can transition % claims from % to %',
        (SELECT allowed_actor FROM claim_status_transition_rules
         WHERE resource_type = resource_record.type
           AND from_status = OLD.status
           AND to_status = NEW.status
         LIMIT 1),
        resource_record.type,
        OLD.status,
        NEW.status;
    ELSE
      RAISE EXCEPTION 'Invalid status transition for %: % -> %',
        resource_record.type,
        OLD.status,
        NEW.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
