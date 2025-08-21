-- Fix duplicate claims for resources without timeslots
-- Add partial unique constraint to prevent multiple claims per user per resource when timeslot_id is NULL

-- Add partial unique constraint for non-timeslot claims
ALTER TABLE resource_claims 
ADD CONSTRAINT resource_claims_unique_non_timeslot 
UNIQUE (resource_id, user_id) 
WHERE timeslot_id IS NULL;