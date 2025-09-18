-- Update broadcast RLS policy to be more specific about notification channels
-- Drop the existing broad policy and replace with user-specific channel policy

-- Drop the existing policy
DROP POLICY IF EXISTS "Authenticated users can receive broadcasts" ON realtime.messages;

-- Create a new policy that only allows listening to user's own notification channel
CREATE POLICY "Allow listening for broadcasts from user's notification channel" ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.messages.extension = 'broadcast'
  AND realtime.topic() = 'user:' || auth.uid()::text || ':notifications'
);