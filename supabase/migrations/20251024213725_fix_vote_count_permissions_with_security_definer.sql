-- Fix vote_count permission issue by using SECURITY DEFINER
-- This allows the trigger function to update vote_count with elevated privileges

-- Drop and recreate the trigger function with SECURITY DEFINER
DROP TRIGGER IF EXISTS maintain_vote_count ON resource_claims;
DROP FUNCTION IF EXISTS update_timeslot_vote_count();

CREATE OR REPLACE FUNCTION update_timeslot_vote_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
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

-- Recreate the trigger
CREATE TRIGGER maintain_vote_count
AFTER INSERT OR UPDATE OR DELETE ON resource_claims
FOR EACH ROW
EXECUTE FUNCTION update_timeslot_vote_count();
