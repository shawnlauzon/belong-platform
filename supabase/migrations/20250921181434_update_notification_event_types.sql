-- Migration: Update notification event types to follow entity.action pattern
-- This drops and recreates the notifications table with new event type format,
-- removes the conversation broadcast system, and simplifies notification broadcasting.

-- 1. Drop dependent objects
DROP VIEW IF EXISTS notification_details;

-- Drop all existing notification policies to clean up duplicates
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Service role can create notifications" ON notifications;
DROP POLICY IF EXISTS "Allow notification creation from triggers" ON notifications;
DROP POLICY IF EXISTS "Allow authenticated notification creation" ON notifications;
DROP POLICY IF EXISTS "Allow postgres notification creation" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "conversation_participants_can_receive_messages" ON messages;
DROP POLICY IF EXISTS "conversation_participants_can_send_messages" ON messages;
DROP POLICY IF EXISTS "users_can_receive_notifications" ON notifications;

DROP TABLE IF EXISTS notifications CASCADE;

-- Drop functions that depend on the notification_type enum
DROP FUNCTION IF EXISTS should_send_notification(UUID, notification_type);
DROP FUNCTION IF EXISTS create_notification_base(UUID, notification_type, UUID, UUID, UUID, UUID, UUID, UUID, JSONB);
DROP FUNCTION IF EXISTS create_notification(UUID, notification_type, UUID, TEXT, TEXT, TEXT, UUID, UUID, UUID, UUID, UUID, UUID, JSONB);

DROP TYPE IF EXISTS notification_type;

-- Drop all existing RLS policies on realtime.messages
DROP POLICY IF EXISTS "Allow listening for broadcasts from user's notification channel" ON realtime.messages;
DROP POLICY IF EXISTS "Allow listening to community chat for members" ON realtime.messages;
DROP POLICY IF EXISTS "Allow listening to user messages for authenticated user" ON realtime.messages;
DROP POLICY IF EXISTS "Allow sending to community chat for members" ON realtime.messages;
DROP POLICY IF EXISTS "Allow sending to user messages for authenticated users" ON realtime.messages;
DROP POLICY IF EXISTS "Users can receive their messages and community chats" ON realtime.messages;
DROP POLICY IF EXISTS "Users can send messages to community members and community chat" ON realtime.messages;

-- 2. Create new enum with entity.action format
CREATE TYPE notification_type AS ENUM (
  'message.created',
  'conversation.created',
  'comment.created',
  'comment.replied',
  'claim.created',
  'resource.created',
  'event.created',
  'shoutout.received',
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
  'trustpoints.gained',
  'trustpoints.lost',
  'trustlevel.changed'
);

-- 3. Recreate notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
  comment_id UUID REFERENCES comments(id) ON DELETE SET NULL,
  claim_id UUID REFERENCES resource_claims(id) ON DELETE SET NULL,
  community_id UUID REFERENCES communities(id) ON DELETE SET NULL,
  shoutout_id UUID REFERENCES shoutouts(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE read_at IS NULL;

-- 5. Enable RLS and create essential policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create minimal, clean set of policies with clear names
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Allow system to create notifications for users" ON notifications
  FOR INSERT TO service_role, authenticated
  WITH CHECK (
    (auth.role() = 'service_role') OR
    (auth.role() = 'authenticated' AND user_id = auth.uid())
  );

CREATE POLICY "Users can mark their own notifications as read" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 7. Recreate notification_details view
CREATE VIEW notification_details AS
SELECT
    n.id,
    n.user_id,
    n.type,
    n.resource_id,
    n.comment_id,
    n.claim_id,
    n.community_id,
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

-- 8. Remove conversation broadcast system
DROP TRIGGER IF EXISTS broadcast_conversation_trigger ON conversation_participants;
DROP TRIGGER IF EXISTS new_conversation_broadcast_trigger ON conversation_participants;
DROP FUNCTION IF EXISTS broadcast_new_conversation();

-- 9. Update broadcast function to use type as event name and remove type from payload
CREATE OR REPLACE FUNCTION broadcast_new_notification()
RETURNS TRIGGER AS $$
DECLARE
  notification_data RECORD;
  notification_payload JSONB;
BEGIN
  -- Fetch the full notification details from the view
  SELECT * INTO notification_data
  FROM notification_details
  WHERE id = NEW.id;

  -- Convert RECORD to JSONB and remove the type field (since event name conveys it)
  notification_payload := to_jsonb(notification_data) - 'type';

  -- Use the notification type directly as the event name
  PERFORM realtime.send(
    payload := notification_payload,
    event := NEW.type::text,
    topic := 'user:' || NEW.user_id::text || ':notifications',
    private := true
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER broadcast_notification_trigger
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION broadcast_new_notification();

-- 10. Update all notification creation functions to use new types

-- Update create_notification_base function
CREATE OR REPLACE FUNCTION create_notification_base(
  p_user_id UUID,
  p_type notification_type,
  p_resource_id UUID DEFAULT NULL,
  p_comment_id UUID DEFAULT NULL,
  p_claim_id UUID DEFAULT NULL,
  p_community_id UUID DEFAULT NULL,
  p_shoutout_id UUID DEFAULT NULL,
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
    community_id, shoutout_id, actor_id, metadata
  ) VALUES (
    p_user_id, p_type, p_resource_id, p_comment_id, p_claim_id,
    p_community_id, p_shoutout_id, p_actor_id, p_metadata
  ) RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$;

-- Update notify_trust_points function to use new types
CREATE OR REPLACE FUNCTION notify_trust_points(
  p_user_id uuid,
  p_community_id uuid,
  p_points_change integer DEFAULT NULL::integer,
  p_new_score integer DEFAULT NULL::integer,
  p_old_score integer DEFAULT NULL::integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  metadata_json JSONB := '{}';
  notification_type_val notification_type;
BEGIN
  -- Determine type based on points change
  IF p_points_change > 0 THEN
    notification_type_val := 'trustpoints.gained';
  ELSE
    notification_type_val := 'trustpoints.lost';
  END IF;

  -- Build metadata with score change information
  IF p_points_change IS NOT NULL THEN
    metadata_json := jsonb_build_object('amount', p_points_change);

    -- Add score values if provided
    IF p_new_score IS NOT NULL THEN
      metadata_json := metadata_json || jsonb_build_object('new_score', p_new_score);
    END IF;

    IF p_old_score IS NOT NULL THEN
      metadata_json := metadata_json || jsonb_build_object('old_score', p_old_score);
    END IF;
  END IF;

  RETURN create_notification_base(
    p_user_id := p_user_id,
    p_type := notification_type_val,
    p_community_id := p_community_id,
    p_metadata := metadata_json
  );
END;
$$;

-- Update notify_trust_level_change function
CREATE OR REPLACE FUNCTION notify_trust_level_change(
  p_user_id uuid,
  p_community_id uuid,
  p_old_level integer DEFAULT NULL::integer,
  p_new_level integer DEFAULT NULL::integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  metadata_json JSONB := '{}';
BEGIN
  -- Add level change information to metadata
  IF p_old_level IS NOT NULL AND p_new_level IS NOT NULL THEN
    metadata_json := jsonb_build_object(
      'old_level', p_old_level,
      'new_level', p_new_level
    );
  END IF;

  RETURN create_notification_base(
    p_user_id := p_user_id,
    p_type := 'trustlevel.changed',
    p_community_id := p_community_id,
    p_metadata := metadata_json
  );
END;
$$;

-- Update notify_on_shoutout function
CREATE OR REPLACE FUNCTION notify_on_shoutout()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_notification_base(
    p_user_id := NEW.receiver_id,
    p_type := 'shoutout.received',
    p_community_id := NEW.community_id,
    p_shoutout_id := NEW.id,
    p_actor_id := NEW.sender_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update notify_on_connection_request function
CREATE OR REPLACE FUNCTION notify_on_connection_request()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_notification_base(
    p_user_id := NEW.receiver_id,
    p_type := 'connection.requested',
    p_actor_id := NEW.sender_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update notify_on_connection_accepted function
CREATE OR REPLACE FUNCTION notify_on_connection_accepted()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify the original requester
  PERFORM create_notification_base(
    p_user_id := NEW.sender_id,
    p_type := 'connection.accepted',
    p_actor_id := NEW.receiver_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update notify_on_claim_status_change function
CREATE OR REPLACE FUNCTION notify_on_claim_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_resource RECORD;
  v_community_id UUID;
  v_notification_type notification_type;
BEGIN
  -- Get resource details
  SELECT r.type, r.owner_id, r.title
  INTO v_resource
  FROM resources r
  JOIN resource_timeslots rt ON rt.resource_id = r.id
  WHERE rt.id = NEW.timeslot_id;

  -- Determine notification type based on status change
  IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
    v_notification_type := 'claim.approved';

    -- Notify the claimant
    FOR v_community_id IN
      SELECT rc.community_id
      FROM resource_communities rc
      JOIN resource_timeslots rt ON rt.resource_id = rc.resource_id
      WHERE rt.id = NEW.timeslot_id
    LOOP
      PERFORM create_notification_base(
        p_user_id := NEW.claimant_id,
        p_type := v_notification_type,
        p_resource_id := v_resource.id,
        p_claim_id := NEW.id,
        p_community_id := v_community_id,
        p_actor_id := v_resource.owner_id
      );
    END LOOP;

  ELSIF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
    v_notification_type := 'claim.rejected';

    -- Notify the claimant
    FOR v_community_id IN
      SELECT rc.community_id
      FROM resource_communities rc
      JOIN resource_timeslots rt ON rt.resource_id = rc.resource_id
      WHERE rt.id = NEW.timeslot_id
    LOOP
      PERFORM create_notification_base(
        p_user_id := NEW.claimant_id,
        p_type := v_notification_type,
        p_resource_id := v_resource.id,
        p_claim_id := NEW.id,
        p_community_id := v_community_id,
        p_actor_id := v_resource.owner_id
      );
    END LOOP;

  ELSIF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
    v_notification_type := 'claim.cancelled';

    -- Notify the resource owner
    FOR v_community_id IN
      SELECT rc.community_id
      FROM resource_communities rc
      JOIN resource_timeslots rt ON rt.resource_id = rc.resource_id
      WHERE rt.id = NEW.timeslot_id
    LOOP
      PERFORM create_notification_base(
        p_user_id := v_resource.owner_id,
        p_type := v_notification_type,
        p_resource_id := v_resource.id,
        p_claim_id := NEW.id,
        p_community_id := v_community_id,
        p_actor_id := NEW.claimant_id
      );
    END LOOP;

  ELSIF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    v_notification_type := 'claim.completed';

    -- Notify the resource owner
    FOR v_community_id IN
      SELECT rc.community_id
      FROM resource_communities rc
      JOIN resource_timeslots rt ON rt.resource_id = rc.resource_id
      WHERE rt.id = NEW.timeslot_id
    LOOP
      PERFORM create_notification_base(
        p_user_id := v_resource.owner_id,
        p_type := v_notification_type,
        p_resource_id := v_resource.id,
        p_claim_id := NEW.id,
        p_community_id := v_community_id,
        p_actor_id := NEW.claimant_id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update notify_on_resource_update function
CREATE OR REPLACE FUNCTION notify_on_resource_update()
RETURNS TRIGGER AS $$
DECLARE
  v_claimant_id UUID;
  v_community_id UUID;
BEGIN
  -- Only notify if significant fields changed
  IF OLD.title IS DISTINCT FROM NEW.title OR
     OLD.description IS DISTINCT FROM NEW.description OR
     OLD.type IS DISTINCT FROM NEW.type THEN

    -- Notify all claimants of this resource
    FOR v_claimant_id IN
      SELECT DISTINCT rc.claimant_id
      FROM resource_claims rc
      JOIN resource_timeslots rt ON rt.id = rc.timeslot_id
      WHERE rt.resource_id = NEW.id
        AND rc.status IN ('approved', 'going', 'given', 'received')
    LOOP
      -- Notify for each community the resource is in
      FOR v_community_id IN
        SELECT rc.community_id
        FROM resource_communities rc
        WHERE rc.resource_id = NEW.id
      LOOP
        PERFORM create_notification_base(
          p_user_id := v_claimant_id,
          p_type := 'resource.updated',
          p_resource_id := NEW.id,
          p_community_id := v_community_id,
          p_actor_id := NEW.owner_id
        );
      END LOOP;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update notify_on_resource_cancellation function
CREATE OR REPLACE FUNCTION notify_on_resource_cancellation()
RETURNS TRIGGER AS $$
DECLARE
  v_claimant_id UUID;
  v_community_id UUID;
BEGIN
  -- Only process if resource status changed to cancelled
  IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN

    -- Notify all claimants of this resource
    FOR v_claimant_id IN
      SELECT DISTINCT rc.claimant_id
      FROM resource_claims rc
      JOIN resource_timeslots rt ON rt.id = rc.timeslot_id
      WHERE rt.resource_id = NEW.id
        AND rc.status IN ('approved', 'going', 'given', 'received')
    LOOP
      -- Notify for each community the resource is in
      FOR v_community_id IN
        SELECT rc.community_id
        FROM resource_communities rc
        WHERE rc.resource_id = NEW.id
      LOOP
        PERFORM create_notification_base(
          p_user_id := v_claimant_id,
          p_type := 'resource.cancelled',
          p_resource_id := NEW.id,
          p_community_id := v_community_id,
          p_actor_id := NEW.owner_id
        );
      END LOOP;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update notify_on_membership_join function
CREATE OR REPLACE FUNCTION notify_on_membership_join()
RETURNS TRIGGER AS $$
DECLARE
  v_organizer_id UUID;
BEGIN
  -- Notify community organizers and founders about new members
  FOR v_organizer_id IN
    SELECT user_id
    FROM community_memberships
    WHERE community_id = NEW.community_id
      AND role IN ('founder', 'organizer')
      AND user_id != NEW.user_id
  LOOP
    PERFORM create_notification_base(
      p_user_id := v_organizer_id,
      p_type := 'member.joined',
      p_community_id := NEW.community_id,
      p_actor_id := NEW.user_id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update notify_on_membership_leave function
CREATE OR REPLACE FUNCTION notify_on_membership_leave()
RETURNS TRIGGER AS $$
DECLARE
  v_organizer_id UUID;
BEGIN
  -- Notify community organizers and founders about members leaving
  FOR v_organizer_id IN
    SELECT user_id
    FROM community_memberships
    WHERE community_id = OLD.community_id
      AND role IN ('founder', 'organizer')
      AND user_id != OLD.user_id
  LOOP
    PERFORM create_notification_base(
      p_user_id := v_organizer_id,
      p_type := 'member.left',
      p_community_id := OLD.community_id,
      p_actor_id := OLD.user_id
    );
  END LOOP;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 11. Add notification for new conversations since we removed the separate broadcast system
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

  -- Create notification for the other participant (not the creator)
  PERFORM create_notification_base(
    p_user_id := NEW.user_id,
    p_type := 'conversation.created',
    p_actor_id := creator_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new conversation notifications
CREATE TRIGGER notify_new_conversation_trigger
  AFTER INSERT ON conversation_participants
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_conversation();

-- 12. Fix poorly named policies from realtime.messages table with descriptive names

-- Fix realtime messaging policies (these are for realtime subscriptions)
DROP POLICY IF EXISTS "conversation_participants_can_send_messages" ON realtime.messages;
DROP POLICY IF EXISTS "conversation_participants_can_receive_messages" ON realtime.messages;
DROP POLICY IF EXISTS "users_can_receive_notifications" ON realtime.messages;

-- Create new simplified RLS policies for realtime.messages

-- SELECT Policies
CREATE POLICY "Users can read their notifications" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    extension = 'broadcast'
    AND topic = 'user:' || auth.uid()::text || ':notifications'
  );

CREATE POLICY "Users can read their messages" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    extension = 'broadcast'
    AND topic = 'user:' || auth.uid()::text || ':messages'
  );

CREATE POLICY "Users can read community messages they are members of" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    extension = 'broadcast'
    AND topic LIKE 'community:%:messages'
    AND EXISTS (
      SELECT 1 FROM community_memberships
      WHERE user_id = auth.uid()
      AND community_id = split_part(topic, ':', 2)::uuid
    )
  );

-- INSERT Policies
CREATE POLICY "Users can send messages to communities they are members of" ON realtime.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    extension = 'broadcast'
    AND topic LIKE 'community:%:messages'
    AND EXISTS (
      SELECT 1 FROM community_memberships
      WHERE user_id = auth.uid()
      AND community_id = split_part(topic, ':', 2)::uuid
    )
  );

CREATE POLICY "Users can send messages to users with shared communities" ON realtime.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    extension = 'broadcast'
    AND topic LIKE 'user:%:messages'
    AND EXISTS (
      SELECT 1 FROM community_memberships cm1
      JOIN community_memberships cm2 ON cm1.community_id = cm2.community_id
      WHERE cm1.user_id = auth.uid()
      AND cm2.user_id = split_part(topic, ':', 2)::uuid
    )
  );

-- 13. Add missing notification helper functions that may be called by triggers

-- notify_new_resource function (fixes the "new_resource" enum error)
-- Drop all possible function signatures to ensure clean slate
DROP FUNCTION IF EXISTS notify_new_resource(UUID, UUID, UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS notify_new_resource(UUID, UUID, UUID, UUID, resource_type);
DROP FUNCTION IF EXISTS notify_new_resource CASCADE;

CREATE OR REPLACE FUNCTION notify_new_resource(
  p_user_id UUID,
  p_actor_id UUID,
  p_resource_id UUID,
  p_community_id UUID,
  p_resource_type resource_type
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_type_val notification_type;
BEGIN
  -- Determine notification type based on resource type using correct enum values
  IF p_resource_type = 'event' THEN
    notification_type_val := 'event.created';
  ELSE
    notification_type_val := 'resource.created';
  END IF;

  RETURN create_notification_base(
    p_user_id := p_user_id,
    p_type := notification_type_val,
    p_actor_id := p_actor_id,
    p_resource_id := p_resource_id,
    p_community_id := p_community_id
  );
END;
$$;

-- notify_claim function
DROP FUNCTION IF EXISTS notify_claim(UUID, UUID, UUID, UUID, UUID);
DROP FUNCTION IF EXISTS notify_claim CASCADE;

CREATE OR REPLACE FUNCTION notify_claim(
  p_user_id UUID,
  p_actor_id UUID,
  p_resource_id UUID,
  p_claim_id UUID,
  p_community_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN create_notification_base(
    p_user_id := p_user_id,
    p_type := 'claim.created',
    p_actor_id := p_actor_id,
    p_resource_id := p_resource_id,
    p_claim_id := p_claim_id,
    p_community_id := p_community_id
  );
END;
$$;

-- notify_resource_updated function (fixes the "claimed_resource_updated" enum error)
DROP FUNCTION IF EXISTS notify_resource_updated(UUID, UUID, UUID, UUID, UUID, TEXT[]);
DROP FUNCTION IF EXISTS notify_resource_updated CASCADE;

CREATE OR REPLACE FUNCTION notify_resource_updated(
  p_user_id UUID,
  p_actor_id UUID,
  p_resource_id UUID,
  p_claim_id UUID DEFAULT NULL,
  p_community_id UUID DEFAULT NULL,
  p_changes TEXT[] DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  metadata_json JSONB := '{}';
BEGIN
  -- Add information about what changed
  IF p_changes IS NOT NULL AND array_length(p_changes, 1) > 0 THEN
    metadata_json := jsonb_build_object('changes', p_changes);
  END IF;

  RETURN create_notification_base(
    p_user_id := p_user_id,
    p_type := 'resource.updated',
    p_actor_id := p_actor_id,
    p_resource_id := p_resource_id,
    p_claim_id := p_claim_id,
    p_community_id := p_community_id,
    p_metadata := metadata_json
  );
END;
$$;

-- Fix all remaining notification functions with incorrect enum values

-- Fix notify_comment function
DROP FUNCTION IF EXISTS notify_comment CASCADE;
CREATE OR REPLACE FUNCTION notify_comment(
  p_user_id UUID,
  p_actor_id UUID,
  p_resource_id UUID,
  p_comment_id UUID,
  p_community_id UUID,
  p_content TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  metadata_json JSONB := '{}';
BEGIN
  -- Add comment content preview to metadata
  IF p_content IS NOT NULL THEN
    metadata_json := jsonb_build_object(
      'content_preview', LEFT(p_content, 100)
    );
  END IF;

  RETURN create_notification_base(
    p_user_id := p_user_id,
    p_type := 'comment.created',
    p_actor_id := p_actor_id,
    p_resource_id := p_resource_id,
    p_comment_id := p_comment_id,
    p_community_id := p_community_id,
    p_metadata := metadata_json
  );
END;
$$;

-- Fix notify_comment_reply function
DROP FUNCTION IF EXISTS notify_comment_reply CASCADE;
CREATE OR REPLACE FUNCTION notify_comment_reply(
  p_user_id UUID,
  p_actor_id UUID,
  p_resource_id UUID,
  p_comment_id UUID,
  p_community_id UUID,
  p_content TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  metadata_json JSONB := '{}';
BEGIN
  -- Add comment content preview to metadata
  IF p_content IS NOT NULL THEN
    metadata_json := jsonb_build_object(
      'content_preview', LEFT(p_content, 100)
    );
  END IF;

  RETURN create_notification_base(
    p_user_id := p_user_id,
    p_type := 'comment.replied',
    p_actor_id := p_actor_id,
    p_resource_id := p_resource_id,
    p_comment_id := p_comment_id,
    p_community_id := p_community_id,
    p_metadata := metadata_json
  );
END;
$$;

-- Fix notify_on_comment function to call notify_comment_reply with correct parameters
DROP FUNCTION IF EXISTS notify_on_comment CASCADE;
CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  resource_owner_id UUID;
  parent_comment_author_id UUID;
  resource_community_id UUID;
BEGIN
  -- Get resource owner and community
  SELECT owner_id INTO resource_owner_id
  FROM resources
  WHERE id = NEW.resource_id;

  -- Get community if resource is in one
  SELECT community_id INTO resource_community_id
  FROM resource_communities
  WHERE resource_id = NEW.resource_id
  LIMIT 1;

  -- If this is a reply to another comment, get the parent comment author
  IF NEW.parent_id IS NOT NULL THEN
    SELECT author_id INTO parent_comment_author_id
    FROM comments
    WHERE id = NEW.parent_id;

    -- Notify parent comment author if they're not the commenter
    IF parent_comment_author_id IS NOT NULL AND parent_comment_author_id != NEW.author_id THEN
      PERFORM notify_comment_reply(
        parent_comment_author_id,
        NEW.author_id,
        NEW.resource_id,
        NEW.id,
        resource_community_id,
        NEW.content
      );
    END IF;
  END IF;

  -- Notify resource owner if they're not the commenter and not already notified as parent author
  IF resource_owner_id IS NOT NULL
     AND resource_owner_id != NEW.author_id
     AND (parent_comment_author_id IS NULL OR resource_owner_id != parent_comment_author_id) THEN
    PERFORM notify_comment(
      resource_owner_id,
      NEW.author_id,
      NEW.resource_id,
      NEW.id,
      resource_community_id,
      NEW.content
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add missing comment notification trigger
CREATE TRIGGER comment_notification_trigger
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_comment();

-- Fix notify_on_claim_status_change function to include resource id
DROP FUNCTION IF EXISTS notify_on_claim_status_change CASCADE;
CREATE OR REPLACE FUNCTION notify_on_claim_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_resource RECORD;
  v_community_id UUID;
  v_notification_type notification_type;
BEGIN
  -- Get resource details including id
  SELECT r.id, r.type, r.owner_id, r.title
  INTO v_resource
  FROM resources r
  JOIN resource_timeslots rt ON rt.resource_id = r.id
  WHERE rt.id = NEW.timeslot_id;

  -- Determine notification type based on status change
  IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
    v_notification_type := 'claim.approved';

    -- Notify the claimant
    FOR v_community_id IN
      SELECT rc.community_id
      FROM resource_communities rc
      JOIN resource_timeslots rt ON rt.resource_id = rc.resource_id
      WHERE rt.id = NEW.timeslot_id
    LOOP
      PERFORM create_notification_base(
        p_user_id := NEW.claimant_id,
        p_type := v_notification_type,
        p_resource_id := v_resource.id,
        p_claim_id := NEW.id,
        p_community_id := v_community_id,
        p_actor_id := v_resource.owner_id
      );
    END LOOP;

  ELSIF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
    v_notification_type := 'claim.rejected';

    -- Notify the claimant
    FOR v_community_id IN
      SELECT rc.community_id
      FROM resource_communities rc
      JOIN resource_timeslots rt ON rt.resource_id = rc.resource_id
      WHERE rt.id = NEW.timeslot_id
    LOOP
      PERFORM create_notification_base(
        p_user_id := NEW.claimant_id,
        p_type := v_notification_type,
        p_resource_id := v_resource.id,
        p_claim_id := NEW.id,
        p_community_id := v_community_id,
        p_actor_id := v_resource.owner_id
      );
    END LOOP;

  ELSIF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
    v_notification_type := 'claim.cancelled';

    -- Notify the resource owner
    FOR v_community_id IN
      SELECT rc.community_id
      FROM resource_communities rc
      JOIN resource_timeslots rt ON rt.resource_id = rc.resource_id
      WHERE rt.id = NEW.timeslot_id
    LOOP
      PERFORM create_notification_base(
        p_user_id := v_resource.owner_id,
        p_type := v_notification_type,
        p_resource_id := v_resource.id,
        p_claim_id := NEW.id,
        p_community_id := v_community_id,
        p_actor_id := NEW.claimant_id
      );
    END LOOP;

  ELSIF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    v_notification_type := 'claim.completed';

    -- Notify the resource owner
    FOR v_community_id IN
      SELECT rc.community_id
      FROM resource_communities rc
      JOIN resource_timeslots rt ON rt.resource_id = rc.resource_id
      WHERE rt.id = NEW.timeslot_id
    LOOP
      PERFORM create_notification_base(
        p_user_id := v_resource.owner_id,
        p_type := v_notification_type,
        p_resource_id := v_resource.id,
        p_claim_id := NEW.id,
        p_community_id := v_community_id,
        p_actor_id := NEW.claimant_id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix notify_claim_approved function
DROP FUNCTION IF EXISTS notify_claim_approved CASCADE;
CREATE OR REPLACE FUNCTION notify_claim_approved(
  p_user_id UUID,
  p_actor_id UUID,
  p_resource_id UUID,
  p_claim_id UUID,
  p_community_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN create_notification_base(
    p_user_id := p_user_id,
    p_type := 'claim.approved',
    p_actor_id := p_actor_id,
    p_resource_id := p_resource_id,
    p_claim_id := p_claim_id,
    p_community_id := p_community_id
  );
END;
$$;

-- Add missing trigger for claim status change notifications
CREATE TRIGGER claim_status_change_notification_trigger
  AFTER UPDATE ON resource_claims
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_on_claim_status_change();