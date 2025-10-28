-- Restore trust score triggers that were dropped by CASCADE in push notification redesign
-- The 20251027163547_push_notification_system_redesign.sql migration dropped trust score functions
-- with CASCADE, which also dropped their triggers. The migration recreated the functions but
-- forgot to recreate the triggers, breaking the trust score system.

-- Trigger for community membership insert (join/founder)
CREATE TRIGGER trust_score_on_membership_insert_trigger
  AFTER INSERT ON community_memberships
  FOR EACH ROW
  EXECUTE FUNCTION trust_score_on_membership_insert();

-- Trigger for community membership delete (leave)
CREATE TRIGGER trust_score_on_membership_delete_trigger
  AFTER DELETE ON community_memberships
  FOR EACH ROW
  EXECUTE FUNCTION trust_score_on_membership_delete();

-- Trigger for resource claim insert
CREATE TRIGGER trust_score_on_claim_insert_trigger
  AFTER INSERT ON resource_claims
  FOR EACH ROW
  EXECUTE FUNCTION trust_score_on_claim_insert();

-- Trigger for resource claim update (status changes)
CREATE TRIGGER trust_score_on_claim_update_trigger
  AFTER UPDATE ON resource_claims
  FOR EACH ROW
  EXECUTE FUNCTION trust_score_on_claim_update();

-- Trigger for shoutout insert (send/receive points)
CREATE TRIGGER trust_score_on_shoutout_insert_trigger
  AFTER INSERT ON shoutouts
  FOR EACH ROW
  EXECUTE FUNCTION trust_score_on_shoutout_insert();

-- Trigger for resource community insert (offer creation)
CREATE TRIGGER trust_score_on_resource_community_insert_trigger
  AFTER INSERT ON resource_communities
  FOR EACH ROW
  EXECUTE FUNCTION trust_score_on_resource_community_insert();

COMMENT ON TRIGGER trust_score_on_membership_insert_trigger ON community_memberships IS
  'Awards trust points when users join communities (50 for members, varies by role for founders)';

COMMENT ON TRIGGER trust_score_on_membership_delete_trigger ON community_memberships IS
  'Deducts trust points when users leave communities';

COMMENT ON TRIGGER trust_score_on_claim_insert_trigger ON resource_claims IS
  'Awards initial trust points when users claim events or resources';

COMMENT ON TRIGGER trust_score_on_claim_update_trigger ON resource_claims IS
  'Awards trust points when claim status changes (approved, completed, attended, etc)';

COMMENT ON TRIGGER trust_score_on_shoutout_insert_trigger ON shoutouts IS
  'Awards trust points to both sender (10) and receiver (100) of shoutouts';

COMMENT ON TRIGGER trust_score_on_resource_community_insert_trigger ON resource_communities IS
  'Awards trust points when offers are created (50 points per community)';
