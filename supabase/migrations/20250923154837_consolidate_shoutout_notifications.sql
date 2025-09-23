-- Consolidate shoutout.received and shoutout.sent into single shoutout.created notification type

-- Step 1: Migrate existing data first
UPDATE notifications
SET type = 'shoutout.received'  -- temporarily use existing value
WHERE type = 'shoutout.sent';

UPDATE trust_score_logs
SET action_type = 'shoutout.received'  -- temporarily use existing value
WHERE action_type = 'shoutout.sent';

-- Step 2: Drop dependencies on the enum
DROP VIEW IF EXISTS notification_details;
DROP FUNCTION IF EXISTS update_trust_score(uuid,uuid,notification_type,uuid,integer,jsonb);
DROP FUNCTION IF EXISTS create_notification_base(uuid,notification_type,uuid,uuid,uuid,uuid,uuid,uuid,uuid,jsonb);

-- Step 3: Create new enum with only the values we want
CREATE TYPE notification_type_new AS ENUM (
  'message.created',
  'conversation.created',
  'comment.created',
  'comment.replied',
  'claim.created',
  'resource.created',
  'event.created',
  'shoutout.created',
  'connection.requested',
  'connection.accepted',
  'claim.cancelled',
  'claim.completed',
  'claim.approved',
  'claim.rejected',
  'resource.updated',
  'resource.cancelled',
  'member.joined',
  'member.left',
  'community.created',
  'trustpoints.gained',
  'trustpoints.lost',
  'trustlevel.changed'
);

-- Step 4: Update columns to use new enum, converting shoutout.received to shoutout.created
ALTER TABLE notifications
ALTER COLUMN type TYPE notification_type_new
USING CASE
  WHEN type = 'shoutout.received' THEN 'shoutout.created'::notification_type_new
  ELSE type::text::notification_type_new
END;

ALTER TABLE trust_score_logs
ALTER COLUMN action_type TYPE notification_type_new
USING CASE
  WHEN action_type = 'shoutout.received' THEN 'shoutout.created'::notification_type_new
  ELSE action_type::text::notification_type_new
END;

-- Step 5: Drop old enum and rename new one
DROP TYPE notification_type;
ALTER TYPE notification_type_new RENAME TO notification_type;

-- Recreate notification_details view
CREATE VIEW notification_details AS
SELECT
    n.id,
    n.user_id,
    n.type,
    n.resource_id,
    n.comment_id,
    n.claim_id,
    n.community_id,
    n.shoutout_id,
    n.conversation_id,
    n.actor_id,
    n.metadata,
    n.read_at,
    n.created_at,
    n.updated_at,
    up_actor.full_name AS actor_display_name,
    up_actor.avatar_url AS actor_avatar_url,
    r.title AS resource_title,
    r.type AS resource_type,
    c.name AS community_name,
    c.icon AS community_avatar_url,
    comm.content AS comment_content,
    s.message AS shoutout_message,
    rc.status AS claim_status,
    CASE
        WHEN n.claim_id IS NOT NULL THEN (
            SELECT jsonb_build_object(
                'resource_id', rc_1.resource_id,
                'timeslot_id', rc_1.timeslot_id,
                'status', rc_1.status,
                'commitment_level', rc_1.commitment_level,
                'resource_title', r_1.title,
                'resource_type', r_1.type,
                'claimant_name', pp.full_name,
                'owner_name', po.full_name
            )
            FROM resource_claims rc_1
            JOIN resources r_1 ON r_1.id = rc_1.resource_id
            JOIN public_profiles pp ON pp.id = rc_1.claimant_id
            JOIN public_profiles po ON po.id = r_1.owner_id
            WHERE rc_1.id = n.claim_id
        )
        ELSE NULL::jsonb
    END AS claim_details
FROM notifications n
LEFT JOIN public_profiles up_actor ON n.actor_id = up_actor.id
LEFT JOIN resources r ON n.resource_id = r.id
LEFT JOIN communities c ON n.community_id = c.id
LEFT JOIN comments comm ON n.comment_id = comm.id
LEFT JOIN shoutouts s ON n.shoutout_id = s.id
LEFT JOIN resource_claims rc ON n.claim_id = rc.id;

-- Recreate the functions with the new enum type
CREATE OR REPLACE FUNCTION create_notification_base(
  p_user_id UUID,
  p_type notification_type,
  p_resource_id UUID DEFAULT NULL,
  p_comment_id UUID DEFAULT NULL,
  p_claim_id UUID DEFAULT NULL,
  p_community_id UUID DEFAULT NULL,
  p_shoutout_id UUID DEFAULT NULL,
  p_conversation_id UUID DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id, type, resource_id, comment_id, claim_id,
    community_id, shoutout_id, conversation_id, actor_id, metadata
  ) VALUES (
    p_user_id, p_type, p_resource_id, p_comment_id, p_claim_id,
    p_community_id, p_shoutout_id, p_conversation_id, p_actor_id, p_metadata
  ) RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_trust_score(
  p_user_id uuid,
  p_community_id uuid,
  p_action_type notification_type,
  p_action_id uuid,
  p_points_change integer,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
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

  -- Create notification directly with known action_type (only for positive changes)
  IF p_points_change > 0 THEN
    PERFORM create_notification_base(
      p_user_id := p_user_id,
      p_type := 'trustpoints.gained'::notification_type,
      p_community_id := p_community_id,
      p_metadata := jsonb_build_object(
        'amount', p_points_change,
        'old_score', old_score,
        'new_score', new_score,
        'reason', p_action_type::text
      )
    );
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in update_trust_score for user % community %: %',
      p_user_id, p_community_id, SQLERRM;
END;
$$;

-- Step 6: Update shoutout functions to use shoutout.created
CREATE OR REPLACE FUNCTION notify_on_shoutout()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM create_notification_base(
    p_user_id := NEW.receiver_id,
    p_type := 'shoutout.created',
    p_community_id := NEW.community_id,
    p_shoutout_id := NEW.id,
    p_actor_id := NEW.sender_id
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trust_score_on_shoutout_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Award points to receiver
  PERFORM update_trust_score(
    NEW.receiver_id,
    NEW.community_id,
    'shoutout.created'::notification_type,
    NEW.id,
    100,
    jsonb_build_object(
      'trigger', 'shoutout.created',
      'role', 'receiver',
      'sender_id', NEW.sender_id
    )
  );

  -- Award points to sender
  PERFORM update_trust_score(
    NEW.sender_id,
    NEW.community_id,
    'shoutout.created'::notification_type,
    NEW.id,
    10,
    jsonb_build_object(
      'trigger', 'shoutout.created',
      'role', 'sender',
      'receiver_id', NEW.receiver_id
    )
  );

  RETURN NEW;
END;
$$;