-- ============================================================================
-- MIGRATION: Update Trust Scores to New Reward System
-- Created: 2025-11-09
-- Purpose: Migrate existing trust score logs to new specific action types
--          and recalculate scores based on new point values
--
-- IMPORTANT: Backup created in backup_trust_scores_20251109.sql
-- ============================================================================

-- Add is_inversed column to track inverted actions (like member.left)
ALTER TABLE trust_score_logs
ADD COLUMN IF NOT EXISTS is_inversed BOOLEAN DEFAULT false;

COMMENT ON COLUMN trust_score_logs.is_inversed IS 'True if this action is an inverse of another action (e.g., member.left is inverse of member.joined)';

-- ============================================================================
-- STEP 1: Delete resource.updated logs (5 logs - these have 0 points in new system)
-- ============================================================================

DELETE FROM trust_score_logs WHERE id IN (
  '6be29ee7-0824-4df0-a186-52493e11dfcd',  -- 26d38b42.., 4317c5f7.., 1000 pts
  '193212fb-5bc6-4496-b114-c89224e00cf1',  -- 26d38b42.., 756b5c91.., 1000 pts
  'a1cf3221-1882-4248-bb9f-11487152d735',  -- 3ea8bc26.., 8a9fde35.., 1000 pts
  '442f887b-8a66-49c8-8a58-37e8aaf952e3',  -- a041e53b.., cbda7a8b.., 1000 pts
  '2b6567a1-933d-4677-95e1-f8c29ef1e213'   -- b410ac2d.., d2d57c3d.., 1000 pts
);

-- ============================================================================
-- STEP 2: Update member.joined logs (update points from 50 to 100)
-- ============================================================================

-- Regular members (role='member' or NULL, not founders)
UPDATE trust_score_logs
SET points_change = 100
WHERE action_type = 'member.joined'
  AND points_change = 50
  AND (metadata->>'role' IS NULL OR metadata->>'role' = 'member');

-- ============================================================================
-- STEP 3: Convert member.left to member.joined with is_inversed=true
-- ============================================================================

UPDATE trust_score_logs
SET
  action_type = 'member.joined',
  is_inversed = true,
  points_change = -100
WHERE action_type = 'member.left';

-- ============================================================================
-- STEP 4: Update resource.created logs to specific types
-- ============================================================================

-- Map resource.created to resource.offer.created (50 points - stays same)
-- All existing resource.created logs have "offer" type in metadata
UPDATE trust_score_logs
SET action_type = 'resource.offer.created'
WHERE action_type = 'resource.created'
  AND (metadata->>'resource_type' = 'offer' OR metadata IS NULL);

-- ============================================================================
-- STEP 5: Update claim.created logs to specific types
-- ============================================================================

-- Map claim.created for offers to claim.offer.created (50 points)
UPDATE trust_score_logs
SET
  action_type = 'claim.offer.created',
  points_change = 50
WHERE action_type = 'claim.created'
  AND metadata->>'resource_type' = 'offer'
  AND points_change IN (5, 25);  -- Old points were inconsistent

-- Map claim.created for events to claim.event.going (50 points)
UPDATE trust_score_logs
SET
  action_type = 'claim.event.going',
  points_change = 50
WHERE action_type = 'claim.created'
  AND metadata->>'resource_type' = 'event'
  AND points_change = 5;

-- ============================================================================
-- STEP 6: Update shoutout logs to specific types
-- ============================================================================

-- Shoutout sent by claimant for event
UPDATE trust_score_logs
SET
  action_type = 'shoutout.event.sent.claimant',
  points_change = 80
WHERE id = '81ccc84e-0feb-4bbf-933a-da90a723aaa9';

-- Shoutout received by owner for event
UPDATE trust_score_logs
SET
  action_type = 'shoutout.event.received.owner',
  points_change = 40
WHERE id IN (
  '0f1d1445-7fd9-41cf-8a0d-f374efd9a021',  -- Currently 100
  '799a1698-4329-4c4a-ab7e-72992b0b1459'   -- Currently 100
);

-- Shoutout received by claimant for event
UPDATE trust_score_logs
SET
  action_type = 'shoutout.event.received.claimant',
  points_change = 40
WHERE id = '31f2877c-6527-4d8f-9a48-3c02960df387';

-- Delete duplicate correction log (this was a manual correction that's no longer needed)
DELETE FROM trust_score_logs
WHERE id = '3214e57d-eea0-4dd4-926b-8e5b74ec7ea5';

-- ============================================================================
-- STEP 7: Recalculate score_before and score_after for all logs
-- ============================================================================

-- Create a temporary function to recalculate scores sequentially
CREATE OR REPLACE FUNCTION recalculate_trust_scores()
RETURNS void AS $$
DECLARE
  log_record RECORD;
  running_score INTEGER;
  current_user_id UUID;
  current_community_id UUID;
BEGIN
  -- Process each user-community combination
  FOR current_user_id, current_community_id IN
    SELECT DISTINCT user_id, community_id
    FROM trust_score_logs
    ORDER BY user_id, community_id
  LOOP
    running_score := 0;

    -- Update each log for this user-community in chronological order
    FOR log_record IN
      SELECT id, points_change, created_at
      FROM trust_score_logs
      WHERE user_id = current_user_id
        AND community_id = current_community_id
      ORDER BY created_at ASC, id ASC
    LOOP
      -- Update score_before and score_after
      UPDATE trust_score_logs
      SET
        score_before = running_score,
        score_after = running_score + log_record.points_change
      WHERE id = log_record.id;

      -- Update running score
      running_score := running_score + log_record.points_change;

      -- Ensure score never goes below 0
      IF running_score < 0 THEN
        running_score := 0;
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the recalculation
SELECT recalculate_trust_scores();

-- Drop the temporary function
DROP FUNCTION recalculate_trust_scores();

-- ============================================================================
-- STEP 8: Update trust_scores table with final recalculated scores
-- ============================================================================

-- Update each trust score with the final score_after from the last log entry
UPDATE trust_scores ts
SET
  score = COALESCE((
    SELECT score_after
    FROM trust_score_logs tsl
    WHERE tsl.user_id = ts.user_id
      AND tsl.community_id = ts.community_id
    ORDER BY tsl.created_at DESC, tsl.id DESC
    LIMIT 1
  ), 0),
  last_calculated_at = NOW(),
  updated_at = NOW();

-- ============================================================================
-- VERIFICATION QUERIES (commented out - uncomment to verify)
-- ============================================================================

-- Check log counts by action type
-- SELECT action_type, COUNT(*) as count, SUM(points_change) as total_points
-- FROM trust_score_logs
-- GROUP BY action_type
-- ORDER BY action_type;

-- Verify trust scores match sum of their logs
-- SELECT
--   ts.user_id,
--   ts.community_id,
--   ts.score as current_score,
--   COALESCE(SUM(tsl.points_change), 0) as calculated_score,
--   ts.score - COALESCE(SUM(tsl.points_change), 0) as difference
-- FROM trust_scores ts
-- LEFT JOIN trust_score_logs tsl ON ts.user_id = tsl.user_id AND ts.community_id = tsl.community_id
-- GROUP BY ts.user_id, ts.community_id, ts.score
-- HAVING ts.score != COALESCE(SUM(tsl.points_change), 0);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
