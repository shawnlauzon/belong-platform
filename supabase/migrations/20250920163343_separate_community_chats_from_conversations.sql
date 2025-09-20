-- Separate community chats from conversations
-- This migration restructures the messaging system to separate community chats from direct conversations

-- Add community_id column to messages first
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS community_id uuid REFERENCES communities(id) ON DELETE CASCADE;

-- Make conversation_id nullable
ALTER TABLE messages
ALTER COLUMN conversation_id DROP NOT NULL;

-- Migrate existing community messages to have community_id instead of conversation_id
-- Get community_id from conversations and update messages
UPDATE messages
SET community_id = (
  SELECT community_id
  FROM conversations
  WHERE conversations.id = messages.conversation_id
  AND conversations.conversation_type = 'community'
)
WHERE conversation_id IN (
  SELECT id
  FROM conversations
  WHERE conversation_type = 'community'
);

-- Set conversation_id to NULL for community messages
UPDATE messages
SET conversation_id = NULL
WHERE community_id IS NOT NULL;

-- Add check constraint to ensure exactly one of conversation_id or community_id is set
ALTER TABLE messages
ADD CONSTRAINT messages_conversation_or_community_check
CHECK (
  (conversation_id IS NOT NULL AND community_id IS NULL) OR
  (conversation_id IS NULL AND community_id IS NOT NULL)
);

-- Add chat_read_at column to community_memberships
ALTER TABLE community_memberships
ADD COLUMN chat_read_at timestamp with time zone;

-- Remove community conversations from conversations table
DELETE FROM conversations
WHERE conversation_type = 'community';

-- Drop triggers that automatically create community conversations
DROP TRIGGER IF EXISTS trigger_add_user_to_community_chat ON community_memberships;
DROP TRIGGER IF EXISTS trigger_remove_user_from_community_chat ON community_memberships;
DROP TRIGGER IF EXISTS auto_create_community_conversation_trigger ON communities;
DROP TRIGGER IF EXISTS conversation_insert_broadcast_trigger ON conversations;
DROP TRIGGER IF EXISTS conversation_create_broadcast_trigger ON conversations;
DROP TRIGGER IF EXISTS conversation_update_broadcast_trigger ON conversations;
DROP TRIGGER IF EXISTS new_conversation_broadcast_trigger ON conversation_participants;
DROP TRIGGER IF EXISTS broadcast_conversation_trigger ON conversation_participants;

-- Drop functions related to community conversation management
DROP FUNCTION IF EXISTS create_community_conversation(UUID);
DROP FUNCTION IF EXISTS add_user_to_community_conversation();
DROP FUNCTION IF EXISTS remove_user_from_community_conversation();
DROP FUNCTION IF EXISTS auto_create_community_conversation();
DROP FUNCTION IF EXISTS broadcast_conversation_create();
DROP FUNCTION IF EXISTS broadcast_conversation_insert();
DROP FUNCTION IF EXISTS broadcast_conversation_update();
DROP FUNCTION IF EXISTS broadcast_new_conversation();

-- Drop existing policies that depend on conversation_type before dropping the column
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view conversation messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages to conversations" ON messages;

-- Remove conversation_type and community_id columns from conversations
ALTER TABLE conversations
DROP COLUMN IF EXISTS conversation_type,
DROP COLUMN IF EXISTS community_id;

-- Update RLS policies for messages to handle community_id

-- Drop existing messages policies
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Users can insert messages to conversations they participate in" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

-- Create new messages policies that handle both conversation_id and community_id
CREATE POLICY "Users can view messages in conversations they participate in"
ON messages FOR SELECT
TO authenticated
USING (
  (conversation_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = messages.conversation_id
    AND conversation_participants.user_id = auth.uid()
  ))
  OR
  (community_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM community_memberships
    WHERE community_memberships.community_id = messages.community_id
    AND community_memberships.user_id = auth.uid()
  ))
);

CREATE POLICY "Users can insert messages to conversations they participate in"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  (sender_id IS NULL OR sender_id = auth.uid())
  AND
  (
    (conversation_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    ))
    OR
    (community_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM community_memberships
      WHERE community_memberships.community_id = messages.community_id
      AND community_memberships.user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can update their own messages"
ON messages FOR UPDATE
TO authenticated
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can delete their own messages"
ON messages FOR DELETE
TO authenticated
USING (sender_id = auth.uid());

-- Update conversation RLS policies to remove community type references
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;

CREATE POLICY "Users can view conversations they participate in"
ON conversations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
    AND conversation_participants.user_id = auth.uid()
  )
);

-- Update any functions or triggers that reference conversation_type
-- Note: This would need to be customized based on specific functions in your schema
-- For now, we'll just ensure the schema changes are in place

-- Create index for performance on the new community_id column
CREATE INDEX IF NOT EXISTS idx_messages_community_id ON messages(community_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id) WHERE conversation_id IS NOT NULL;

-- Update the broadcast trigger for messages to handle community messages
DROP TRIGGER IF EXISTS broadcast_message_insert ON messages;

CREATE OR REPLACE FUNCTION broadcast_message_insert()
RETURNS trigger AS $$
BEGIN
  -- For conversation messages, broadcast to conversation channel
  IF NEW.conversation_id IS NOT NULL THEN
    PERFORM realtime.send(
      payload := to_jsonb(NEW),
      event := 'new_message',
      topic := 'conversation:' || NEW.conversation_id || ':messages',
      private := true
    );
  END IF;

  -- For community messages, broadcast to community channel
  IF NEW.community_id IS NOT NULL THEN
    PERFORM realtime.send(
      payload := to_jsonb(NEW),
      event := 'new_message',
      topic := 'community:' || NEW.community_id || ':messages',
      private := true
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER broadcast_message_insert
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION broadcast_message_insert();

-- Recreate broadcast functions without conversation_type references
CREATE OR REPLACE FUNCTION broadcast_conversation_update()
RETURNS trigger AS $$
DECLARE
  conversation_record conversations%ROWTYPE;
BEGIN
  -- Get the full conversation record
  SELECT * INTO conversation_record
  FROM conversations
  WHERE id = NEW.id;

  -- Broadcast the conversation update to all participants (only direct conversations now)
  PERFORM pg_notify(
    'conversation_update',
    json_build_object(
      'type', 'conversation_updated',
      'conversation', json_build_object(
        'id', conversation_record.id,
        'created_at', conversation_record.created_at,
        'updated_at', conversation_record.updated_at
      )
    )::text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION broadcast_new_conversation()
RETURNS trigger AS $$
DECLARE
  participant_record RECORD;
  conversation_data JSONB;
  creator_id UUID;
  participants_array JSONB;
  conversation_record RECORD;
  participant_count INTEGER;
BEGIN
  -- Get the conversation details
  SELECT * INTO conversation_record
  FROM conversations
  WHERE id = NEW.conversation_id;

  -- Check if this is the second participant (when conversation is complete)
  SELECT COUNT(*) INTO participant_count
  FROM conversation_participants
  WHERE conversation_id = NEW.conversation_id;

  -- Only broadcast when we have exactly 2 participants (conversation is complete)
  IF participant_count != 2 THEN
    RETURN NEW;
  END IF;

  -- Get the creator (current authenticated user)
  creator_id := auth.uid();

  -- Only broadcast when the OTHER user is being added
  -- Skip if we're inserting ourselves (prevents duplicate)
  IF NEW.user_id = creator_id THEN
    RETURN NEW;
  END IF;

  -- Fetch participant user_ids
  SELECT json_agg(json_build_object('user_id', cp.user_id))::jsonb
  INTO participants_array
  FROM conversation_participants cp
  WHERE cp.conversation_id = NEW.conversation_id;

  -- Build the conversation data with participants (simplified for direct conversations)
  conversation_data := jsonb_build_object(
    'id', conversation_record.id,
    'created_at', conversation_record.created_at,
    'updated_at', conversation_record.updated_at,
    'conversation_participants', participants_array
  );

  -- Send broadcast to each participant EXCEPT the creator
  FOR participant_record IN
    SELECT user_id
    FROM conversation_participants
    WHERE conversation_id = NEW.conversation_id
      AND (creator_id IS NULL OR user_id != creator_id)
  LOOP
    PERFORM realtime.send(
      payload := conversation_data,
      event := 'new_conversation',
      topic := 'user:' || participant_record.user_id::text || ':notifications',
      private := true
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the triggers for the new functions
CREATE TRIGGER conversation_update_broadcast_trigger
AFTER UPDATE ON conversations
FOR EACH ROW
EXECUTE FUNCTION broadcast_conversation_update();

CREATE TRIGGER new_conversation_broadcast_trigger
AFTER INSERT ON conversation_participants
FOR EACH ROW
EXECUTE FUNCTION broadcast_new_conversation();