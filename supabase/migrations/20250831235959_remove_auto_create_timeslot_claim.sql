-- Drop the auto_create_timeslot_claim trigger that was automatically creating claims
-- when timeslots were created. This trigger doesn't align with the expected workflow
-- where resource owners create timeslots for others to claim.

-- Drop the trigger first
DROP TRIGGER IF EXISTS auto_create_timeslot_claim_trigger ON public.resource_timeslots;

-- Drop the function
DROP FUNCTION IF EXISTS public.auto_create_timeslot_claim();