-- Fix message notification event type
-- The broadcast_message_event function was sending 'new_message' events,
-- but the frontend expects 'message.created' events to match NOTIFICATION_TYPES.MESSAGE_CREATED

CREATE OR REPLACE FUNCTION broadcast_message_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER AS $$
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
      event := 'message.created', -- Changed from 'new_message' to match frontend expectations
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
      event := 'message.created', -- Changed from 'new_message' to match frontend expectations
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

  -- Broadcast the message event to the conversation channel for real-time messaging
  PERFORM realtime.send(
    payload := message_payload,
    event := event_type,
    topic := 'conversation:' || NEW.conversation_id::text || ':messages',
    private := true
  );

  -- Return the appropriate record based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Add initiator_id column to conversations table to track who started the conversation
-- This is needed for proper conversation.created notifications
ALTER TABLE conversations
ADD COLUMN initiator_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- Update notify_on_new_conversation function to use initiator_id from conversations table
-- instead of auth.uid() which is unreliable in trigger context
CREATE OR REPLACE FUNCTION public.notify_on_new_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
  participant_count INTEGER;
  conversation_initiator_id UUID;
BEGIN
  -- Check if this is the second participant (when conversation is complete)
  SELECT COUNT(*) INTO participant_count
  FROM conversation_participants
  WHERE conversation_id = NEW.conversation_id;

  -- Only notify when we have exactly 2 participants (conversation is complete)
  IF participant_count != 2 THEN
    RETURN NEW;
  END IF;

  -- Get the conversation initiator from the conversations table
  SELECT initiator_id INTO conversation_initiator_id
  FROM conversations
  WHERE id = NEW.conversation_id;

  -- Only notify when the OTHER user is being added
  -- Skip if we're inserting the initiator (prevents duplicate)
  IF NEW.user_id = conversation_initiator_id THEN
    RETURN NEW;
  END IF;

  -- Create notification for the other participant (not the initiator) with conversation_id
  PERFORM create_notification_base(
    p_user_id := NEW.user_id,
    p_type := 'conversation.created',
    p_conversation_id := NEW.conversation_id,
    p_actor_id := conversation_initiator_id
  );

  RETURN NEW;
END;
$$;

-- Create trigger to notify about conversation creation when participants are added
CREATE TRIGGER conversation_creation_notification_trigger
AFTER INSERT ON conversation_participants
FOR EACH ROW EXECUTE FUNCTION notify_on_new_conversation();