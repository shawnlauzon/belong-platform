-- Remove conversation.requested notification completely
-- This notification is no longer needed in the system

-- 1. Drop the trigger that creates conversation.requested notifications
DROP TRIGGER IF EXISTS notify_on_conversation_insert_trigger ON conversation_participants;

-- 2. Drop the function that handles conversation request notifications
DROP FUNCTION IF EXISTS notify_on_new_conversation();

-- 3. Remove the mapping from action_to_notification_type_mapping table
DELETE FROM action_to_notification_type_mapping
WHERE action = 'conversation.requested';

-- 4. Drop the conversation_requested column from notification_preferences
ALTER TABLE notification_preferences
DROP COLUMN IF EXISTS conversation_requested;

-- 5. Remove conversation.requested from the action_type enum
-- First, drop the view that depends on the action column
DROP VIEW IF EXISTS notification_details;

-- Create a new enum without conversation.requested
CREATE TYPE action_type_new AS ENUM (
  'resource.commented',
  'comment.replied',
  'claim.created',
  'claim.approved',
  'claim.rejected',
  'claim.cancelled',
  'claim.completed',
  'resource.given',
  'resource.received',
  'resource.created',
  'event.created',
  'resource.updated',
  'event.updated',
  'event.cancelled',
  'resource.expiring',
  'event.starting',
  'message.received',
  'shoutout.received',
  'shoutout.sent',
  'member.joined',
  'member.left',
  'trustlevel.changed',
  'connection.accepted'
);

-- Update all tables that use action_type
ALTER TABLE notifications
ALTER COLUMN action TYPE action_type_new
USING action::text::action_type_new;

ALTER TABLE trust_score_logs
ALTER COLUMN action_type TYPE action_type_new
USING action_type::text::action_type_new;

ALTER TABLE action_to_notification_type_mapping
ALTER COLUMN action TYPE action_type_new
USING action::text::action_type_new;

-- Drop and recreate functions that use action_type
-- Note: We need to get the current function definitions and recreate them with new type

-- Drop the old enum type with CASCADE to handle any remaining dependencies
DROP TYPE action_type CASCADE;

-- Rename the new enum type to the original name
ALTER TYPE action_type_new RENAME TO action_type;

-- Recreate functions with the new action_type enum
-- These will be automatically recreated with the new type since we're using the same name

-- Recreate update_trust_score function that was dropped by CASCADE
CREATE OR REPLACE FUNCTION update_trust_score(
  p_user_id UUID,
  p_community_id UUID,
  p_action_type action_type,
  p_action_id UUID,
  p_points_change INTEGER,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_score INTEGER := 0;
  new_score INTEGER;
  old_score INTEGER;
BEGIN
  -- Get current score for this user in this community
  SELECT score INTO current_score
  FROM trust_scores
  WHERE user_id = p_user_id AND community_id = p_community_id;

  old_score := COALESCE(current_score, 0);
  new_score := old_score + p_points_change;

  -- Insert or update trust score
  INSERT INTO trust_scores (user_id, community_id, score, last_calculated_at, created_at, updated_at)
  VALUES (p_user_id, p_community_id, new_score, NOW(), NOW(), NOW())
  ON CONFLICT (user_id, community_id)
  DO UPDATE SET
    score = new_score,
    last_calculated_at = NOW(),
    updated_at = NOW();

  -- Log the trust score change
  INSERT INTO trust_score_logs (
    user_id, community_id, action_type, action_id,
    points_change, score_before, score_after, metadata, created_at
  ) VALUES (
    p_user_id, p_community_id, p_action_type, p_action_id,
    p_points_change, old_score, new_score, p_metadata, NOW()
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in update_trust_score for user % community %: %',
      p_user_id, p_community_id, SQLERRM;
END;
$$;

COMMENT ON FUNCTION update_trust_score IS 'Updates trust scores and logs changes. Does NOT create notifications - notification creation should be handled by separate triggers if needed.';

-- Recreate create_notification_base function that was dropped by CASCADE
CREATE OR REPLACE FUNCTION create_notification_base(
  p_user_id UUID,
  p_action action_type,
  p_actor_id UUID DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_comment_id UUID DEFAULT NULL,
  p_claim_id UUID DEFAULT NULL,
  p_shoutout_id UUID DEFAULT NULL,
  p_community_id UUID DEFAULT NULL,
  p_conversation_id UUID DEFAULT NULL,
  p_changes TEXT[] DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  -- Insert notification with only changes array (no metadata)
  INSERT INTO notifications (
    user_id,
    action,
    actor_id,
    resource_id,
    comment_id,
    claim_id,
    shoutout_id,
    community_id,
    conversation_id,
    changes
  ) VALUES (
    p_user_id,
    p_action,
    p_actor_id,
    p_resource_id,
    p_comment_id,
    p_claim_id,
    p_shoutout_id,
    p_community_id,
    p_conversation_id,
    p_changes
  )
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$;

COMMENT ON FUNCTION create_notification_base IS 'Creates notification with changes array only - all other data derived from JOINs in notification_details view';

-- Recreate the notification_details view
CREATE VIEW notification_details AS
SELECT
  n.id,
  n.user_id,
  n.action,
  n.resource_id,
  n.comment_id,
  n.claim_id,
  n.community_id,
  n.shoutout_id,
  n.conversation_id,
  n.actor_id,
  n.read_at,
  n.created_at,
  n.updated_at,
  n.changes,

  -- Actor info
  CASE
    WHEN n.actor_id IS NOT NULL THEN
      jsonb_build_object(
        'display_name', COALESCE(up_actor.first_name, up_actor.full_name),
        'full_name', COALESCE(
          up_actor.full_name,
          CASE
            WHEN up_actor.last_name IS NOT NULL
            THEN up_actor.first_name || ' ' || up_actor.last_name
            ELSE up_actor.first_name
          END
        ),
        'avatar_url', up_actor.avatar_url
      )
    ELSE NULL
  END AS actor_data,

  -- Resource info with timeslot
  CASE
    WHEN n.resource_id IS NOT NULL THEN
      jsonb_build_object(
        'title', r.title,
        'type', r.type,
        'status', r.status,
        'voting_deadline', r.voting_deadline,
        'image_url', r.image_urls[1],
        'timeslot_start_time', rt.start_time,
        'timeslot_end_time', rt.end_time
      )
    ELSE NULL
  END AS resource_data,

  -- Comment info
  CASE
    WHEN n.comment_id IS NOT NULL THEN
      jsonb_build_object(
        'content_preview', LEFT(comm.content, 200)
      )
    ELSE NULL
  END AS comment_data,

  -- Claim info with timeslot
  CASE
    WHEN n.claim_id IS NOT NULL THEN (
      SELECT jsonb_build_object(
        'status', rc.status,
        'commitment_level', rc.commitment_level,
        'timeslot_id', rc.timeslot_id,
        'timeslot_start_time', ts.start_time,
        'timeslot_end_time', ts.end_time,
        'resource_id', rc.resource_id,
        'resource_title', r_claim.title,
        'resource_type', r_claim.type,
        'claimant_id', rc.claimant_id,
        'claimant_name', pp.full_name,
        'owner_id', r_claim.owner_id,
        'owner_name', po.full_name
      )
      FROM resource_claims rc
      JOIN resources r_claim ON r_claim.id = rc.resource_id
      JOIN public_profiles pp ON pp.id = rc.claimant_id
      JOIN public_profiles po ON po.id = r_claim.owner_id
      LEFT JOIN resource_timeslots ts ON ts.id = rc.timeslot_id
      WHERE rc.id = n.claim_id
    )
    ELSE NULL
  END AS claim_data,

  -- Community name
  c.name AS community_name,

  -- Shoutout message
  s.message AS shoutout_message

FROM notifications n
LEFT JOIN public_profiles up_actor ON n.actor_id = up_actor.id
LEFT JOIN resources r ON n.resource_id = r.id
LEFT JOIN LATERAL (
  SELECT start_time, end_time
  FROM resource_timeslots
  WHERE resource_id = r.id
  ORDER BY start_time
  LIMIT 1
) rt ON TRUE
LEFT JOIN communities c ON n.community_id = c.id
LEFT JOIN comments comm ON n.comment_id = comm.id
LEFT JOIN shoutouts s ON n.shoutout_id = s.id;
