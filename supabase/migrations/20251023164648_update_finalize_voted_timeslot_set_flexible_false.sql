-- Update finalize_voted_timeslot to set timeslots_flexible to false
-- This locks the timeslots after voting is finalized

CREATE OR REPLACE FUNCTION finalize_voted_timeslot(
  p_resource_id UUID,
  p_chosen_timeslot_id UUID,
  p_requires_approval BOOLEAN
) RETURNS VOID AS $$
BEGIN
  -- Update resource status and lock timeslots
  UPDATE resources
  SET status = 'scheduled',
      timeslots_flexible = false
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
