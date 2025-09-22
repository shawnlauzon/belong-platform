-- Add conversation_id column to notifications table and update related functions

-- 1. Add conversation_id column to notifications table
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;

-- 2. Update notification_details view to include conversation_id
DROP VIEW IF EXISTS notification_details;

CREATE VIEW notification_details AS
SELECT
    n.id,
    n.user_id,
    n.type,
    n.resource_id,
    n.comment_id,
    n.claim_id,
    n.community_id,
    n.conversation_id,
    n.actor_id,
    n.metadata,
    n.read_at,
    n.created_at,
    n.updated_at,
    n.shoutout_id,
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

-- 3. Drop old function signatures and create new one with conversation_id support
DROP FUNCTION IF EXISTS create_notification_base CASCADE;

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
) RETURNS UUID
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

-- 4. Drop old conversation notification function and recreate with conversation_id support
DROP FUNCTION IF EXISTS notify_on_new_conversation CASCADE;

CREATE OR REPLACE FUNCTION notify_on_new_conversation()
RETURNS TRIGGER AS $$
DECLARE
  participant_record RECORD;
  creator_id UUID;
  participant_count INTEGER;
BEGIN
  -- Check if this is the second participant (when conversation is complete)
  SELECT COUNT(*) INTO participant_count
  FROM conversation_participants
  WHERE conversation_id = NEW.conversation_id;

  -- Only notify when we have exactly 2 participants (conversation is complete)
  IF participant_count != 2 THEN
    RETURN NEW;
  END IF;

  -- Get the creator (assuming the current authenticated user is creating the conversation)
  creator_id := auth.uid();

  -- Only notify when the OTHER user is being added
  -- Skip if we're inserting ourselves (prevents duplicate)
  IF NEW.user_id = creator_id THEN
    RETURN NEW;
  END IF;

  -- Create notification for the other participant (not the creator) with conversation_id
  PERFORM create_notification_base(
    p_user_id := NEW.user_id,
    p_type := 'conversation.created',
    p_conversation_id := NEW.conversation_id,
    p_actor_id := creator_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;