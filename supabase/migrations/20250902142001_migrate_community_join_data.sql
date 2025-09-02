-- Migrate existing community_join entries to use new specific action types
-- This migration assumes the previous migration already added the new enum values

-- Update existing trust_score_logs entries
-- Update organizer entries (role = 'organizer' in metadata)
UPDATE trust_score_logs 
SET action_type = 'community_organizer_join'::trust_score_action_type
WHERE action_type = 'community_join'::trust_score_action_type
  AND metadata->>'role' = 'organizer';

-- Update member entries (role = 'member' or null in metadata, or points_change = 50)
UPDATE trust_score_logs 
SET action_type = 'community_member_join'::trust_score_action_type
WHERE action_type = 'community_join'::trust_score_action_type
  AND (metadata->>'role' = 'member' OR metadata->>'role' IS NULL OR points_change = 50);

-- Step 3: Update the trust_score_on_membership_insert function
CREATE OR REPLACE FUNCTION public.trust_score_on_membership_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  points_to_award INTEGER;
  action_type_to_use trust_score_action_type;
BEGIN
  -- Award different points based on role
  IF NEW.role = 'organizer' THEN
    points_to_award := 500;  -- Organizer joining (community creation flow)
    action_type_to_use := 'community_organizer_join'::trust_score_action_type;
  ELSE
    points_to_award := 50;   -- Regular member joining
    action_type_to_use := 'community_member_join'::trust_score_action_type;
  END IF;

  PERFORM update_trust_score(
    NEW.user_id,
    NEW.community_id,
    action_type_to_use,
    NEW.community_id,
    points_to_award,
    jsonb_build_object(
      'trigger', 'community_membership_insert',
      'role', NEW.role
    )
  );
  RETURN NEW;
END;
$function$;