-- Fix messages RLS policy to restrict read access to conversation participants only
-- This replaces the overly permissive "Enable read access for authenticated users" policy

-- Drop ALL existing SELECT policies to avoid duplicates
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON messages;
DROP POLICY IF EXISTS "Participants can view messages" ON messages;
DROP POLICY IF EXISTS "Participants can read messages" ON messages;

-- Create proper policy that only allows participants to read messages in their conversations
CREATE POLICY "Participants can read messages" 
ON messages 
FOR SELECT 
TO authenticated
USING (user_is_conversation_participant(conversation_id, auth.uid()));

