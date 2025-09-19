-- Migration: Update notification broadcast to use realtime.send()
-- This updates the notification broadcast function to use realtime.send()
-- for consistency with the conversation broadcast implementation.

-- Drop existing trigger
DROP TRIGGER IF EXISTS broadcast_notification_trigger ON notifications;

-- Update function to use realtime.send() instead of broadcast_changes()
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

  -- Convert RECORD to JSONB for realtime.send
  notification_payload := to_jsonb(notification_data);

  -- Broadcast using realtime.send (consistent with conversation broadcast)
  PERFORM realtime.send(
    payload := notification_payload,
    event := 'new_notification',
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