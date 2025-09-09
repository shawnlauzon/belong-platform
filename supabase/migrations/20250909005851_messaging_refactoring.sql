-- Messaging System Refactor
-- Remove unneeded columns, replace message_status with conversation_status, and update functions

-- 1. Create conversation_status table first (replacing message_status)
CREATE TABLE conversation_status (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (conversation_id, user_id)
);

-- Add indexes for performance
CREATE INDEX idx_conversation_status_user_id ON conversation_status(user_id);
CREATE INDEX idx_conversation_status_last_received_at ON conversation_status(last_received_at);
CREATE INDEX idx_conversation_status_unread ON conversation_status(user_id) WHERE last_read_at IS NULL OR last_read_at < last_received_at;

-- RLS policies for conversation_status
ALTER TABLE conversation_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own conversation status"
ON conversation_status FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own conversation status"
ON conversation_status FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "System can insert conversation status"
ON conversation_status FOR INSERT
TO authenticated
WITH CHECK (true);

-- 5. Migrate existing data from message_status to conversation_status (if table exists)
-- This aggregates per-conversation status instead of per-message
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'message_status') THEN
    INSERT INTO conversation_status (conversation_id, user_id, last_received_at, last_read_at)
    SELECT 
      m.conversation_id,
      ms.user_id,
      MAX(ms.delivered_at) as last_received_at,
      MAX(ms.read_at) as last_read_at
    FROM message_status ms
    JOIN messages m ON m.id = ms.message_id
    GROUP BY m.conversation_id, ms.user_id
    ON CONFLICT (conversation_id, user_id) DO UPDATE SET
      last_received_at = GREATEST(conversation_status.last_received_at, EXCLUDED.last_received_at),
      last_read_at = GREATEST(conversation_status.last_read_at, EXCLUDED.last_read_at);
    
    RAISE NOTICE 'Migrated data from message_status to conversation_status';
  ELSE
    RAISE NOTICE 'message_status table does not exist, skipping data migration';
  END IF;
END $$;

-- 2. Remove columns from conversation_participants
ALTER TABLE conversation_participants DROP COLUMN IF EXISTS unread_count;
ALTER TABLE conversation_participants DROP COLUMN IF EXISTS last_read_at;

-- 3. Remove columns from messages
ALTER TABLE messages DROP COLUMN IF EXISTS previous_content;
ALTER TABLE messages DROP COLUMN IF EXISTS message_type;

-- 4. Drop tables completely
DROP TABLE IF EXISTS message_reports CASCADE;
DROP TABLE IF EXISTS message_status CASCADE;

-- 5. Update/replace functions

-- First drop the old community chat triggers that depend on functions
DROP TRIGGER IF EXISTS trigger_add_user_to_community_chat ON community_memberships;
DROP TRIGGER IF EXISTS trigger_remove_user_from_community_chat ON community_memberships;

-- Replace create_community_conversation with auto_create_community_conversation (trigger function)
DROP FUNCTION IF EXISTS create_community_conversation(uuid);

CREATE OR REPLACE FUNCTION auto_create_community_conversation()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Check if conversation already exists (should not happen, but safety check)
  SELECT id INTO v_conversation_id 
  FROM conversations 
  WHERE community_id = NEW.id AND conversation_type = 'community';
  
  -- If conversation already exists, just return NEW
  IF v_conversation_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Create the community conversation
  INSERT INTO conversations (community_id, conversation_type)
  VALUES (NEW.id, 'community')
  RETURNING id INTO v_conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rename and rewrite add_user_to_community_conversation to fetch_community_conversation
DROP FUNCTION IF EXISTS add_user_to_community_conversation();

CREATE OR REPLACE FUNCTION fetch_community_conversation(p_community_id UUID)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
  v_current_user_id UUID;
BEGIN
  v_current_user_id := auth.uid();
  
  -- Check that auth user is member of community
  IF NOT EXISTS (
    SELECT 1 FROM community_memberships 
    WHERE community_id = p_community_id AND user_id = v_current_user_id
  ) THEN
    RAISE EXCEPTION 'User is not a member of this community';
  END IF;

  -- Find the community conversation (should always exist due to auto-creation)
  SELECT id INTO v_conversation_id 
  FROM conversations 
  WHERE community_id = p_community_id AND conversation_type = 'community';

  -- If no conversation exists, this is an error (should have been auto-created)
  IF v_conversation_id IS NULL THEN
    RAISE EXCEPTION 'Community conversation does not exist for community %', p_community_id;
  END IF;

  -- Add/update entry in conversation_status for this user
  INSERT INTO conversation_status (conversation_id, user_id, last_received_at, last_read_at)
  VALUES (v_conversation_id, v_current_user_id, NOW(), NOW())
  ON CONFLICT (conversation_id, user_id) DO UPDATE SET
    last_received_at = NOW();

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rename and update mark_messages_as_read to mark_conversation_as_read
DROP FUNCTION IF EXISTS mark_messages_as_read(uuid);

CREATE OR REPLACE FUNCTION mark_conversation_as_read(p_conversation_id UUID)
RETURNS VOID AS $$
DECLARE
  v_current_user_id UUID;
BEGIN
  v_current_user_id := auth.uid();
  
  -- Update conversation_status setting last_read_at to NOW()
  UPDATE conversation_status
  SET last_read_at = NOW()
  WHERE conversation_id = p_conversation_id
    AND user_id = v_current_user_id;
    
  -- If no row was updated, insert a new one
  IF NOT FOUND THEN
    INSERT INTO conversation_status (conversation_id, user_id, last_received_at, last_read_at)
    VALUES (p_conversation_id, v_current_user_id, NOW(), NOW())
    ON CONFLICT (conversation_id, user_id) DO UPDATE SET
      last_read_at = NOW();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete remove_user_from_community_conversation function
DROP FUNCTION IF EXISTS remove_user_from_community_conversation();

-- Update update_conversation_on_message function
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Update conversation metadata
  UPDATE conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = CASE 
      WHEN NEW.is_deleted THEN '[Message deleted]'
      ELSE LEFT(NEW.content, 100)
    END,
    last_message_sender_id = NEW.sender_id,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  
  -- Create/update conversation_status for all participants (except sender)
  INSERT INTO conversation_status (conversation_id, user_id, last_received_at)
  SELECT NEW.conversation_id, cp.user_id, NEW.created_at
  FROM conversation_participants cp
  WHERE cp.conversation_id = NEW.conversation_id
    AND cp.user_id != NEW.sender_id
  ON CONFLICT (conversation_id, user_id) DO UPDATE SET
    last_received_at = GREATEST(conversation_status.last_received_at, NEW.created_at);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create new triggers

-- Create auto_create_community_conversation_trigger
CREATE TRIGGER auto_create_community_conversation_trigger
AFTER INSERT ON communities
FOR EACH ROW
EXECUTE FUNCTION auto_create_community_conversation();

-- 7. Create conversations for existing communities that don't have one
INSERT INTO conversations (community_id, conversation_type)
SELECT c.id, 'community'
FROM communities c
WHERE NOT EXISTS (
  SELECT 1 FROM conversations conv
  WHERE conv.community_id = c.id AND conv.conversation_type = 'community'
);

-- Set default value for sender_id to authenticated user (keeping original change)
ALTER TABLE messages ALTER COLUMN sender_id SET DEFAULT auth.uid();