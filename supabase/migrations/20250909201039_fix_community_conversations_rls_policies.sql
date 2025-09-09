-- Fix RLS policies for community conversations
-- Community conversations don't have participants in conversation_participants table
-- Instead, all community members should have access to their community's conversation

-- First, create a helper function to check if user is a community member
CREATE OR REPLACE FUNCTION user_is_community_member(p_community_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM community_memberships
    WHERE community_id = p_community_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove the confusing fetch_community_conversation function since direct table access should work
DROP FUNCTION IF EXISTS fetch_community_conversation(uuid);

-- Add debugging to the auto_create_community_conversation function
-- IMPORTANT: Use SECURITY DEFINER so trigger can bypass RLS policies
CREATE OR REPLACE FUNCTION auto_create_community_conversation()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Debug: Log that trigger is called
  RAISE NOTICE 'auto_create_community_conversation triggered for community %', NEW.id;
  
  -- Check if conversation already exists (should not happen, but safety check)
  SELECT id INTO v_conversation_id 
  FROM conversations 
  WHERE community_id = NEW.id AND conversation_type = 'community';
  
  -- If conversation already exists, just return NEW
  IF v_conversation_id IS NOT NULL THEN
    RAISE NOTICE 'Conversation already exists: %', v_conversation_id;
    RETURN NEW;
  END IF;

  -- Create the community conversation
  INSERT INTO conversations (community_id, conversation_type)
  VALUES (NEW.id, 'community')
  RETURNING id INTO v_conversation_id;
  
  RAISE NOTICE 'Created conversation % for community %', v_conversation_id, NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the conversations SELECT policy to handle community conversations
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
CREATE POLICY "Users can view their conversations"
ON conversations FOR SELECT
TO authenticated
USING (
  -- For direct conversations: user must be a participant
  (conversation_type = 'direct' AND user_is_conversation_participant(id, auth.uid()))
  OR
  -- For community conversations: user must be a community member
  (conversation_type = 'community' AND community_id IS NOT NULL AND user_is_community_member(community_id, auth.uid()))
);

-- Update the conversations UPDATE policy similarly
DROP POLICY IF EXISTS "Users can update their conversations" ON conversations;
CREATE POLICY "Users can update their conversations"
ON conversations FOR UPDATE
TO authenticated
USING (
  -- For direct conversations: user must be a participant
  (conversation_type = 'direct' AND user_is_conversation_participant(id, auth.uid()))
  OR
  -- For community conversations: user must be a community member
  (conversation_type = 'community' AND community_id IS NOT NULL AND user_is_community_member(community_id, auth.uid()))
);

-- Update messages SELECT policy to handle community conversations
DROP POLICY IF EXISTS "Participants can view messages" ON messages;
CREATE POLICY "Participants can view messages"
ON messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (
      -- For direct conversations: user must be a participant
      (c.conversation_type = 'direct' AND user_is_conversation_participant(c.id, auth.uid()))
      OR
      -- For community conversations: user must be a community member
      (c.conversation_type = 'community' AND c.community_id IS NOT NULL AND user_is_community_member(c.community_id, auth.uid()))
    )
  )
);

-- Update messages INSERT policy to handle community conversations
DROP POLICY IF EXISTS "Participants can send messages" ON messages;
CREATE POLICY "Participants can send messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (
      -- For direct conversations: user must be a participant and not blocked
      (c.conversation_type = 'direct' 
       AND user_is_conversation_participant(c.id, auth.uid())
       AND NOT EXISTS (
         SELECT 1 FROM blocked_users
         WHERE (blocker_id = auth.uid() AND blocked_id = messages.sender_id)
         OR (blocked_id = auth.uid() AND blocker_id = messages.sender_id)
       )
      )
      OR
      -- For community conversations: user must be a community member
      (c.conversation_type = 'community' AND c.community_id IS NOT NULL AND user_is_community_member(c.community_id, auth.uid()))
    )
  )
);

-- Update conversation_status policies if they exist to handle community conversations
-- First check if the table and policies exist
DO $$
BEGIN
  -- Only create policies if the table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversation_status') THEN
    
    -- Drop and recreate SELECT policy
    DROP POLICY IF EXISTS "Users can view their conversation status" ON conversation_status;
    CREATE POLICY "Users can view their conversation status"
    ON conversation_status FOR SELECT
    TO authenticated
    USING (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id = conversation_status.conversation_id
        AND (
          -- For direct conversations: user must be a participant
          (c.conversation_type = 'direct' AND user_is_conversation_participant(c.id, auth.uid()))
          OR
          -- For community conversations: user must be a community member
          (c.conversation_type = 'community' AND c.community_id IS NOT NULL AND user_is_community_member(c.community_id, auth.uid()))
        )
      )
    );

    -- Drop and recreate INSERT/UPDATE policy
    DROP POLICY IF EXISTS "Users can update their conversation status" ON conversation_status;
    CREATE POLICY "Users can update their conversation status"
    ON conversation_status FOR ALL
    TO authenticated
    USING (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id = conversation_status.conversation_id
        AND (
          -- For direct conversations: user must be a participant
          (c.conversation_type = 'direct' AND user_is_conversation_participant(c.id, auth.uid()))
          OR
          -- For community conversations: user must be a community member
          (c.conversation_type = 'community' AND c.community_id IS NOT NULL AND user_is_community_member(c.community_id, auth.uid()))
        )
      )
    )
    WITH CHECK (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM conversations c
        WHERE c.id = conversation_status.conversation_id
        AND (
          -- For direct conversations: user must be a participant
          (c.conversation_type = 'direct' AND user_is_conversation_participant(c.id, auth.uid()))
          OR
          -- For community conversations: user must be a community member
          (c.conversation_type = 'community' AND c.community_id IS NOT NULL AND user_is_community_member(c.community_id, auth.uid()))
        )
      )
    );

  END IF;
END $$;