-- Remove conversation channel broadcast from broadcast_message_event function
-- Keep notification broadcasts to user notification channels

CREATE OR REPLACE FUNCTION public.broadcast_message_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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

  -- NOTE: Removed the conversation channel broadcast section:
  -- PERFORM realtime.send(
  --   payload := message_payload,
  --   event := event_type,
  --   topic := 'conversation:' || NEW.conversation_id::text || ':messages',
  --   private := true
  -- );

  -- Return the appropriate record based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$;