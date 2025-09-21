-- Add comprehensive realtime policies for user messages and community chat
-- This migration consolidates all realtime.messages policy updates

-- =====================================================
-- DROP OLD CONVERSATION POLICY
-- =====================================================

-- Remove the old conversation-based policy that's being replaced
DROP POLICY IF EXISTS "Allow listening to conversation messages for participants" ON realtime.messages;

-- =====================================================
-- ADD USER MESSAGES POLICY
-- =====================================================

-- Add RLS policy for user messages channel (user:{userId}:messages)
CREATE POLICY "Allow listening to user messages for authenticated user"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  extension = 'broadcast'::text
  AND realtime.topic() = ('user:'::text || (auth.uid())::text || ':messages'::text)
);

-- =====================================================
-- ADD COMMUNITY CHAT POLICIES
-- =====================================================

-- Create SELECT policy for community chat (community:{community_id}:messages)
CREATE POLICY "Allow listening to community chat for members"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  extension = 'broadcast'::text
  AND realtime.topic() ~~ 'community:%:messages'::text
  AND EXISTS (
    SELECT 1 FROM community_memberships cm
    WHERE cm.community_id = (split_part(realtime.topic(), ':', 2))::uuid
    AND cm.user_id = auth.uid()
  )
);

-- Create INSERT policy for community chat (community:{community_id}:messages)
CREATE POLICY "Allow sending to community chat for members"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  extension = 'broadcast'::text
  AND realtime.topic() ~~ 'community:%:messages'::text
  AND EXISTS (
    SELECT 1 FROM community_memberships cm
    WHERE cm.community_id = (split_part(realtime.topic(), ':', 2))::uuid
    AND cm.user_id = auth.uid()
  )
);

-- Create INSERT policy for user messages (user:{user_id}:messages)
-- This allows any authenticated user to send messages to any user's channel
-- The receiving UI can decide whether to show these messages based on conversation approval
CREATE POLICY "Allow sending to user messages for authenticated users"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  extension = 'broadcast'::text
  AND realtime.topic() ~~ 'user:%:messages'::text
);

-- =====================================================
-- CONVERSATION CHANNEL POLICIES
-- =====================================================

-- Policy to allow conversation participants to send broadcasts to conversation channels (INSERT)
CREATE POLICY "conversation_participants_can_send_messages"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  extension = 'broadcast'::text
  AND realtime.topic() ~~ 'conversation:%:messages'::text
  AND EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id =
      (split_part(realtime.topic(), ':', 2))::uuid
    AND conversation_participants.user_id = auth.uid()
  )
);

-- Policy to allow conversation participants to receive broadcasts from conversation channels (SELECT)
CREATE POLICY "conversation_participants_can_receive_messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  extension = 'broadcast'::text
  AND realtime.topic() ~~ 'conversation:%:messages'::text
  AND EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id =
      (split_part(realtime.topic(), ':', 2))::uuid
    AND conversation_participants.user_id = auth.uid()
  )
);

-- Policy to allow users to receive notifications on their own notification channel (SELECT)
CREATE POLICY "users_can_receive_notifications"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  extension = 'broadcast'::text
  AND realtime.topic() ~~ 'user:%:notifications'::text
  AND (split_part(realtime.topic(), ':', 2))::uuid = auth.uid()
);

-- =====================================================
-- UPDATE MESSAGE BROADCAST TRIGGER
-- =====================================================

-- Update the broadcast_message_event function to handle all message operations
CREATE OR REPLACE FUNCTION broadcast_message_event()
RETURNS TRIGGER AS $$
DECLARE
  event_type TEXT;
  message_payload JSONB;
BEGIN
  -- Determine event type based on operation and content
  IF TG_OP = 'INSERT' THEN
    event_type := 'message.created';
    message_payload := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if message was soft-deleted
    IF NEW.is_deleted = true AND OLD.is_deleted = false THEN
      event_type := 'message.deleted';
    ELSE
      event_type := 'message.updated';
    END IF;
    message_payload := to_jsonb(NEW);
  END IF;

  -- Send notifications to other conversation participants (not the sender)
  -- Only for conversation messages, not community messages
  IF NEW.conversation_id IS NOT NULL THEN
    PERFORM realtime.send(
      payload := jsonb_build_object(
        'conversationId', NEW.conversation_id,
        'messageId', NEW.id,
        'senderId', NEW.sender_id,
        'content', NEW.content,
        'createdAt', NEW.created_at,
        'eventType', event_type
      ),
      event := 'new_message',
      topic := 'user:' || participant_id || ':notifications',
      private := true
    )
    FROM (
      SELECT user_id as participant_id
      FROM conversation_participants
      WHERE conversation_id = NEW.conversation_id
      AND user_id != NEW.sender_id
    ) participants;
  END IF;

  -- Send notifications to other community members (not the sender)
  -- Only for community messages, not conversation messages
  IF NEW.community_id IS NOT NULL THEN
    PERFORM realtime.send(
      payload := jsonb_build_object(
        'communityId', NEW.community_id,
        'messageId', NEW.id,
        'senderId', NEW.sender_id,
        'content', NEW.content,
        'createdAt', NEW.created_at,
        'eventType', event_type
      ),
      event := 'new_message',
      topic := 'user:' || member_id || ':notifications',
      private := true
    )
    FROM (
      SELECT user_id as member_id
      FROM community_memberships
      WHERE community_id = NEW.community_id
      AND user_id != NEW.sender_id
    ) members;
  END IF;

  -- Return the appropriate record based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the old trigger and function if they exist
DROP TRIGGER IF EXISTS broadcast_message_insert ON messages;
DROP FUNCTION IF EXISTS broadcast_message_insert();

-- Create/Update trigger to execute the function after message operations
DROP TRIGGER IF EXISTS broadcast_message_trigger ON messages;
CREATE TRIGGER broadcast_message_trigger
  AFTER INSERT OR UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION broadcast_message_event();