-- ============================================
-- MESSAGING SYSTEM MIGRATION
-- ============================================

-- 1. Create conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  last_message_sender_id UUID REFERENCES profiles(id)
);

-- 2. Create conversation_participants table
CREATE TABLE conversation_participants (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_read_at TIMESTAMPTZ,
  unread_count INTEGER DEFAULT 0 NOT NULL,
  PRIMARY KEY (conversation_id, user_id)
);

-- 3. Create messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'system')) NOT NULL,
  is_edited BOOLEAN DEFAULT FALSE NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  encryption_version INTEGER DEFAULT 1 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Create message_status table
CREATE TABLE message_status (
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  delivered_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  read_at TIMESTAMPTZ,
  PRIMARY KEY (message_id, user_id)
);

-- 5. Create blocked_users table
CREATE TABLE blocked_users (
  blocker_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- 6. Create message_reports table
CREATE TABLE message_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) NOT NULL,
  reporter_id UUID REFERENCES profiles(id) NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'other')),
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')) NOT NULL,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  UNIQUE(message_id, reporter_id)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Conversations indexes
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC NULLS LAST);

-- Participants indexes
CREATE INDEX idx_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX idx_participants_unread ON conversation_participants(user_id, unread_count) WHERE unread_count > 0;

-- Messages indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- Message status indexes
CREATE INDEX idx_message_status_user ON message_status(user_id);
CREATE INDEX idx_message_status_unread ON message_status(user_id, read_at) WHERE read_at IS NULL;

-- Blocked users indexes
CREATE INDEX idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked ON blocked_users(blocked_id);

-- Message reports indexes
CREATE INDEX idx_message_reports_status ON message_reports(status) WHERE status = 'pending';
CREATE INDEX idx_message_reports_message ON message_reports(message_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Check if two users share a community
CREATE OR REPLACE FUNCTION users_share_community(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM community_memberships cm1
    JOIN community_memberships cm2 ON cm1.community_id = cm2.community_id
    WHERE cm1.user_id = user1_id 
    AND cm2.user_id = user2_id
    AND cm1.status = 'active'
    AND cm2.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get or create conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_conversation(other_user_id UUID)
RETURNS UUID AS $$
DECLARE
  conv_id UUID;
  current_user_id UUID;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- Validate not messaging self
  IF current_user_id = other_user_id THEN
    RAISE EXCEPTION 'Cannot create conversation with yourself';
  END IF;
  
  -- Check if users share a community
  IF NOT users_share_community(current_user_id, other_user_id) THEN
    RAISE EXCEPTION 'Users must share a community to message';
  END IF;

  -- Check if blocked
  IF EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_id = current_user_id AND blocked_id = other_user_id)
    OR (blocker_id = other_user_id AND blocked_id = current_user_id)
  ) THEN
    RAISE EXCEPTION 'Cannot create conversation with blocked user';
  END IF;

  -- Check for existing conversation
  SELECT c.id INTO conv_id
  FROM conversations c
  WHERE EXISTS (
    SELECT 1 FROM conversation_participants cp1
    WHERE cp1.conversation_id = c.id AND cp1.user_id = current_user_id
  ) AND EXISTS (
    SELECT 1 FROM conversation_participants cp2
    WHERE cp2.conversation_id = c.id AND cp2.user_id = other_user_id
  );

  -- Create new conversation if none exists
  IF conv_id IS NULL THEN
    INSERT INTO conversations DEFAULT VALUES RETURNING id INTO conv_id;
    INSERT INTO conversation_participants (conversation_id, user_id) 
    VALUES 
      (conv_id, current_user_id),
      (conv_id, other_user_id);
  END IF;

  RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate exactly 2 participants per conversation
CREATE OR REPLACE FUNCTION validate_conversation_participants()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM conversation_participants WHERE conversation_id = NEW.conversation_id) > 2 THEN
    RAISE EXCEPTION 'Conversations can only have exactly 2 participants';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_two_participants
BEFORE INSERT ON conversation_participants
FOR EACH ROW EXECUTE FUNCTION validate_conversation_participants();

-- Function to update conversation on new message
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
  
  -- Increment unread count for other participant
  UPDATE conversation_participants
  SET unread_count = unread_count + 1
  WHERE conversation_id = NEW.conversation_id
  AND user_id != NEW.sender_id;
  
  -- Create message status for recipient
  INSERT INTO message_status (message_id, user_id)
  SELECT NEW.id, user_id
  FROM conversation_participants
  WHERE conversation_id = NEW.conversation_id
  AND user_id != NEW.sender_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_new_message
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(p_conversation_id UUID)
RETURNS void AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  -- Update message status
  UPDATE message_status
  SET read_at = NOW()
  WHERE user_id = current_user_id
  AND read_at IS NULL
  AND message_id IN (
    SELECT id FROM messages 
    WHERE conversation_id = p_conversation_id
  );
  
  -- Reset unread count
  UPDATE conversation_participants
  SET 
    unread_count = 0,
    last_read_at = NOW()
  WHERE conversation_id = p_conversation_id
  AND user_id = current_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reports ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can view their conversations"
ON conversations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conversations.id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create conversations"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update their conversations"
ON conversations FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conversations.id
    AND user_id = auth.uid()
  )
);

-- Conversation participants policies
CREATE POLICY "Users can view conversation participants"
ON conversation_participants FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add participants"
ON conversation_participants FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR auth.uid() IN (
  SELECT user_id FROM conversation_participants 
  WHERE conversation_id = conversation_participants.conversation_id
));

CREATE POLICY "Users can update their participation"
ON conversation_participants FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Messages policies
CREATE POLICY "Participants can view messages"
ON messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = messages.conversation_id
    AND user_id = auth.uid()
  )
  AND NOT is_deleted
);

CREATE POLICY "Participants can send messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = messages.conversation_id
    AND user_id = auth.uid()
  )
  AND NOT EXISTS (
    SELECT 1 FROM blocked_users
    WHERE blocker_id IN (
      SELECT user_id FROM conversation_participants 
      WHERE conversation_id = messages.conversation_id
      AND user_id != auth.uid()
    )
    AND blocked_id = auth.uid()
  )
);

CREATE POLICY "Users can edit their messages"
ON messages FOR UPDATE
TO authenticated
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());

-- Message status policies
CREATE POLICY "Users can view their message status"
ON message_status FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "System can create message status"
ON message_status FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update their message status"
ON message_status FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Blocked users policies
CREATE POLICY "Users can view their blocks"
ON blocked_users FOR SELECT
TO authenticated
USING (blocker_id = auth.uid() OR blocked_id = auth.uid());

CREATE POLICY "Users can block others"
ON blocked_users FOR INSERT
TO authenticated
WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users can unblock"
ON blocked_users FOR DELETE
TO authenticated
USING (blocker_id = auth.uid());

-- Message reports policies
CREATE POLICY "Users can report messages"
ON message_reports FOR INSERT
TO authenticated
WITH CHECK (
  reporter_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM messages m
    JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_reports.message_id
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their reports"
ON message_reports FOR SELECT
TO authenticated
USING (reporter_id = auth.uid());

-- ============================================
-- REALTIME PUBLICATION
-- ============================================

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;