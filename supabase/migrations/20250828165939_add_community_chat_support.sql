-- Add community chat support to existing conversations infrastructure

-- Create enum for conversation type
CREATE TYPE conversation_type AS ENUM ('direct', 'community');

-- Add columns to conversations table
ALTER TABLE conversations 
ADD COLUMN community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
ADD COLUMN conversation_type conversation_type NOT NULL DEFAULT 'direct';

-- Create index for efficient community conversation lookups
CREATE INDEX idx_conversations_community_id ON conversations(community_id) WHERE community_id IS NOT NULL;
CREATE INDEX idx_conversations_type ON conversations(conversation_type);

-- Create constraint to ensure community conversations have community_id
ALTER TABLE conversations 
ADD CONSTRAINT check_community_conversation_has_community_id 
CHECK (
  (conversation_type = 'direct' AND community_id IS NULL) OR
  (conversation_type = 'community' AND community_id IS NOT NULL)
);

-- Update RLS policies for conversations to handle community access

-- Drop existing policies and recreate with community support
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create direct conversations" ON conversations;

CREATE POLICY "Users can view conversations they participate in" ON conversations
  FOR SELECT USING (
    -- Direct conversations: user is a participant
    (conversation_type = 'direct' AND id IN (
      SELECT conversation_id FROM conversation_participants 
      WHERE user_id = auth.uid()
    ))
    OR
    -- Community conversations: user is a community member
    (conversation_type = 'community' AND community_id IN (
      SELECT community_id FROM community_memberships 
      WHERE user_id = auth.uid()
    ))
  );

-- Policy for creating conversations (community conversations created by system only)
CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (
    -- Only allow direct conversations via user actions
    conversation_type = 'direct'
    -- Community conversations will be created by system functions
  );

-- Update message policies to handle community conversations
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;

CREATE POLICY "Users can view messages in conversations" ON messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE (
        -- Direct conversations: user is a participant
        (conversation_type = 'direct' AND id IN (
          SELECT conversation_id FROM conversation_participants 
          WHERE user_id = auth.uid()
        ))
        OR
        -- Community conversations: user is a community member
        (conversation_type = 'community' AND community_id IN (
          SELECT community_id FROM community_memberships 
          WHERE user_id = auth.uid()
        ))
      )
    )
  );

-- Update message send policy for community conversations
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON messages;

CREATE POLICY "Users can send messages in conversations" ON messages
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations WHERE (
        -- Direct conversations: user is a participant
        (conversation_type = 'direct' AND id IN (
          SELECT conversation_id FROM conversation_participants 
          WHERE user_id = auth.uid()
        ))
        OR
        -- Community conversations: user is a community member
        (conversation_type = 'community' AND community_id IN (
          SELECT community_id FROM community_memberships 
          WHERE user_id = auth.uid()
        ))
      )
    )
  );

-- Function to create community conversation
CREATE OR REPLACE FUNCTION create_community_conversation(p_community_id UUID)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
  v_community_name TEXT;
BEGIN
  -- Get community name for conversation metadata
  SELECT name INTO v_community_name FROM communities WHERE id = p_community_id;
  
  IF v_community_name IS NULL THEN
    RAISE EXCEPTION 'Community not found with id: %', p_community_id;
  END IF;

  -- Create the community conversation
  INSERT INTO conversations (community_id, conversation_type, last_message_preview)
  VALUES (p_community_id, 'community', 'Welcome to ' || v_community_name || ' community chat!')
  RETURNING id INTO v_conversation_id;

  -- Add all current community members as participants
  INSERT INTO conversation_participants (conversation_id, user_id, joined_at, last_read_at, unread_count)
  SELECT 
    v_conversation_id,
    cm.user_id,
    cm.created_at,  -- Use their community join date as chat join date
    cm.created_at,  -- Mark as read from their join time
    0               -- No unread messages initially
  FROM community_memberships cm
  WHERE cm.community_id = p_community_id;

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add user to community conversation when they join community
CREATE OR REPLACE FUNCTION add_user_to_community_conversation()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Find the community conversation
  SELECT id INTO v_conversation_id 
  FROM conversations 
  WHERE community_id = NEW.community_id AND conversation_type = 'community';

  -- If community conversation exists, add user as participant
  IF v_conversation_id IS NOT NULL THEN
    INSERT INTO conversation_participants (conversation_id, user_id, joined_at, last_read_at, unread_count)
    VALUES (v_conversation_id, NEW.user_id, NEW.created_at, NEW.created_at, 0)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove user from community conversation when they leave community
CREATE OR REPLACE FUNCTION remove_user_from_community_conversation()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Find the community conversation
  SELECT id INTO v_conversation_id 
  FROM conversations 
  WHERE community_id = OLD.community_id AND conversation_type = 'community';

  -- If community conversation exists, remove user as participant
  IF v_conversation_id IS NOT NULL THEN
    DELETE FROM conversation_participants 
    WHERE conversation_id = v_conversation_id AND user_id = OLD.user_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for automatic participant management
CREATE TRIGGER trigger_add_user_to_community_chat
  AFTER INSERT ON community_memberships
  FOR EACH ROW
  EXECUTE FUNCTION add_user_to_community_conversation();

CREATE TRIGGER trigger_remove_user_from_community_chat
  AFTER DELETE ON community_memberships
  FOR EACH ROW
  EXECUTE FUNCTION remove_user_from_community_conversation();

-- Add comments to document the schema changes
COMMENT ON COLUMN conversations.community_id IS 'Links conversation to a community for community chat functionality';
COMMENT ON COLUMN conversations.conversation_type IS 'Type of conversation: direct (1-to-1) or community (group chat)';
COMMENT ON CONSTRAINT check_community_conversation_has_community_id ON conversations IS 'Ensures community conversations have community_id and direct conversations do not';