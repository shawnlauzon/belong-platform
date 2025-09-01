-- Add community_leave to trust_score_action_type enum
ALTER TYPE trust_score_action_type ADD VALUE 'community_leave';

-- Create function to handle trust score deduction on community leave
CREATE OR REPLACE FUNCTION trust_score_on_membership_delete()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_trust_score(
    OLD.user_id,
    OLD.community_id,
    'community_leave'::trust_score_action_type,
    OLD.community_id,
    -50,
    jsonb_build_object('trigger', 'community_membership_delete')
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on community_memberships DELETE to deduct trust score points
CREATE TRIGGER trust_score_on_membership_delete_trigger
  AFTER DELETE ON community_memberships
  FOR EACH ROW
  EXECUTE FUNCTION trust_score_on_membership_delete();