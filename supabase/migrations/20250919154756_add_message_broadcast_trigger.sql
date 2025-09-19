-- Migration: Add message broadcast trigger for real-time messaging
-- This broadcasts message events to the conversation channel when messages are created,
-- updated, or soft-deleted (is_deleted = true).

-- Create function to broadcast message events
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
    event_type := 'created';
    message_payload := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if message was soft-deleted
    IF NEW.is_deleted = true AND OLD.is_deleted = false THEN
      event_type := 'deleted';
    ELSE
      event_type := 'updated';
    END IF;
    message_payload := to_jsonb(NEW);
  END IF;

  -- Broadcast the message event to the conversation channel
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

-- Create trigger to execute the function after message operations
CREATE TRIGGER broadcast_message_trigger
  AFTER INSERT OR UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION broadcast_message_event();

-- Add RLS policy to allow only conversation participants to listen to message broadcasts
CREATE POLICY "Allow listening to conversation messages for participants"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.messages.extension = 'broadcast'
  AND realtime.topic() LIKE 'conversation:%:messages'
  AND EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id =
      split_part(split_part(realtime.topic(), ':', 2), ':', 1)::uuid
    AND conversation_participants.user_id = auth.uid()
  )
);