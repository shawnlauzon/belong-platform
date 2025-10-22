-- Add voting system support for events

-- 1. Update resource_status enum (replace 'open' with 'scheduled', add 'voting')
-- Drop the default first
ALTER TABLE resources ALTER COLUMN status DROP DEFAULT;

-- Convert to text, migrate data, then convert to new enum
ALTER TABLE resources ALTER COLUMN status TYPE TEXT;

-- Migrate existing 'open' resources to 'scheduled'
UPDATE resources SET status = 'scheduled' WHERE status = 'open';

-- Drop old enum and create new one
DROP TYPE resource_status;
CREATE TYPE resource_status AS ENUM ('voting', 'scheduled', 'completed', 'cancelled');

-- Convert column back to enum
ALTER TABLE resources ALTER COLUMN status TYPE resource_status USING status::resource_status;

-- Restore the default with new value
ALTER TABLE resources ALTER COLUMN status SET DEFAULT 'scheduled'::resource_status;

-- 2. Add 'proposed' to timeslot status enum
ALTER TYPE resource_timeslot_status ADD VALUE 'proposed';

-- 3. Add 'vote' to claim status enum
ALTER TYPE resource_claim_status ADD VALUE 'vote';

-- 4. Add new columns to resources table
ALTER TABLE resources
  ADD COLUMN voting_deadline TIMESTAMP WITH TIME ZONE,
  ADD COLUMN duration_minutes INTEGER;

-- 5. Add vote_count to resource_timeslots table
ALTER TABLE resource_timeslots
  ADD COLUMN vote_count INTEGER NOT NULL DEFAULT 0;

-- 6. Create trigger function to maintain vote_count
CREATE OR REPLACE FUNCTION update_timeslot_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT
  IF (TG_OP = 'INSERT') THEN
    IF NEW.status = 'vote' THEN
      UPDATE resource_timeslots
      SET vote_count = vote_count + 1
      WHERE id = NEW.timeslot_id;
    END IF;
    RETURN NEW;
  END IF;

  -- Handle DELETE
  IF (TG_OP = 'DELETE') THEN
    IF OLD.status = 'vote' THEN
      UPDATE resource_timeslots
      SET vote_count = vote_count - 1
      WHERE id = OLD.timeslot_id;
    END IF;
    RETURN OLD;
  END IF;

  -- Handle UPDATE
  IF (TG_OP = 'UPDATE') THEN
    -- Status changed from vote to something else
    IF OLD.status = 'vote' AND NEW.status != 'vote' THEN
      UPDATE resource_timeslots
      SET vote_count = vote_count - 1
      WHERE id = OLD.timeslot_id;
    END IF;

    -- Status changed to vote from something else
    IF OLD.status != 'vote' AND NEW.status = 'vote' THEN
      UPDATE resource_timeslots
      SET vote_count = vote_count + 1
      WHERE id = NEW.timeslot_id;
    END IF;

    -- Timeslot changed while status is vote
    IF OLD.timeslot_id != NEW.timeslot_id AND NEW.status = 'vote' THEN
      UPDATE resource_timeslots SET vote_count = vote_count - 1 WHERE id = OLD.timeslot_id;
      UPDATE resource_timeslots SET vote_count = vote_count + 1 WHERE id = NEW.timeslot_id;
    END IF;

    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger for vote_count maintenance
CREATE TRIGGER maintain_vote_count
AFTER INSERT OR UPDATE OR DELETE ON resource_claims
FOR EACH ROW
EXECUTE FUNCTION update_timeslot_vote_count();

-- 8. Create DB function for atomic finalization
CREATE OR REPLACE FUNCTION finalize_voted_timeslot(
  p_resource_id UUID,
  p_chosen_timeslot_id UUID,
  p_requires_approval BOOLEAN
) RETURNS VOID AS $$
BEGIN
  -- Update resource status
  UPDATE resources
  SET status = 'scheduled'
  WHERE id = p_resource_id AND status = 'voting';

  -- Activate chosen timeslot
  UPDATE resource_timeslots
  SET status = 'active'
  WHERE id = p_chosen_timeslot_id AND status = 'proposed';

  -- Cancel unchosen timeslots
  UPDATE resource_timeslots
  SET status = 'cancelled'
  WHERE resource_id = p_resource_id
    AND id != p_chosen_timeslot_id
    AND status = 'proposed';

  -- Convert votes for chosen timeslot to attendance
  UPDATE resource_claims
  SET status = CASE
    WHEN p_requires_approval THEN 'pending'::resource_claim_status
    ELSE 'going'::resource_claim_status
  END
  WHERE timeslot_id = p_chosen_timeslot_id
    AND status = 'vote';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Update notification trigger to use 'scheduled' instead of 'open'
CREATE OR REPLACE FUNCTION notify_on_resource_community_insert()
RETURNS TRIGGER AS $$
DECLARE
  resource_record RECORD;
  member_record RECORD;
BEGIN
  -- Get resource details
  SELECT * INTO resource_record
  FROM resources
  WHERE id = NEW.resource_id;

  -- Skip if resource doesn't exist or is not scheduled
  IF resource_record IS NULL OR resource_record.status != 'scheduled' THEN
    RETURN NEW;
  END IF;

  -- Notify all community members about new resource
  FOR member_record IN
    SELECT user_id
    FROM community_memberships
    WHERE community_id = NEW.community_id
      AND user_id != resource_record.owner_id
  LOOP
    PERFORM notify_new_resource(
      member_record.user_id,
      resource_record.owner_id,
      NEW.resource_id,
      NEW.community_id,
      resource_record.type
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Update claim state validation trigger to handle 'vote' status
CREATE OR REPLACE FUNCTION validate_claim_state_transition()
RETURNS TRIGGER AS $$
DECLARE
  resource_record RECORD;
  user_is_owner BOOLEAN := FALSE;
  user_is_claimant BOOLEAN := FALSE;
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

  -- Handle vote status transitions
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
$$ LANGUAGE plpgsql;
