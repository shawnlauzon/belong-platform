-- Migration: Add notification broadcast trigger
-- This migration adds a database trigger that broadcasts notification details
-- when a new notification is inserted, eliminating the need for postgres_changes
-- and an additional fetch in the frontend.

-- Enable realtime for authenticated users to receive broadcasts
CREATE POLICY "Authenticated users can receive broadcasts"
ON "realtime"."messages"
FOR SELECT
TO authenticated
USING (true);

-- Create function to broadcast new notification details
CREATE OR REPLACE FUNCTION broadcast_new_notification()
RETURNS TRIGGER AS $$
DECLARE
  notification_data RECORD;
BEGIN
  -- Fetch the full notification details from the view
  SELECT * INTO notification_data
  FROM notification_details
  WHERE id = NEW.id;

  -- Broadcast the notification details to the user's channel
  PERFORM realtime.broadcast_changes(
    topic_name := 'user:' || NEW.user_id::text || ':notifications',
    event_name := 'new_notification',
    operation := TG_OP,
    table_name := TG_TABLE_NAME,
    table_schema := TG_TABLE_SCHEMA,
    new := notification_data,
    old := NULL
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to execute the function after INSERT
CREATE TRIGGER broadcast_notification_trigger
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION broadcast_new_notification();