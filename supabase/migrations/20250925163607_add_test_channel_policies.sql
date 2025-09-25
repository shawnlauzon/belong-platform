-- Add test channel policies for debugging Supabase realtime channels
-- This allows all authenticated users to read/write to test:*:chat channels

-- =====================================================
-- ADD TEST CHANNEL POLICIES FOR DEBUGGING
-- =====================================================

-- Policy to allow all authenticated users to receive messages from test channels (SELECT)
CREATE POLICY "Allow all authenticated users to read test channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  extension = 'broadcast'::text
  AND realtime.topic() ~~ 'test:%:chat'::text
);

-- Policy to allow all authenticated users to send messages to test channels (INSERT)
CREATE POLICY "Allow all authenticated users to write to test channels"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  extension = 'broadcast'::text
  AND realtime.topic() ~~ 'test:%:chat'::text
);