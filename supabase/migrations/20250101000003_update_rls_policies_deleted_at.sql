-- Migration: Update all RLS policies to use `deleted_at IS NULL` instead of `is_active = true`
-- This ensures deleted records are invisible at the database level through RLS

BEGIN;

-- Communities: Update policies to use deleted_at IS NULL
DROP POLICY IF EXISTS "Communities are viewable by members" ON communities;
CREATE POLICY "Communities are viewable by members" ON communities
  FOR SELECT
  USING (
    deleted_at IS NULL AND
    (
      visibility = 'public' OR
      auth.uid() IN (
        SELECT user_id FROM community_members 
        WHERE community_id = communities.id
      )
    )
  );

DROP POLICY IF EXISTS "Community creators can create communities" ON communities;
CREATE POLICY "Community creators can create communities" ON communities
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Community owners can update their communities" ON communities;
CREATE POLICY "Community owners can update their communities" ON communities
  FOR UPDATE
  USING (
    deleted_at IS NULL AND
    auth.uid() = created_by
  );

-- Events: Update policies from is_active = true to deleted_at IS NULL
DROP POLICY IF EXISTS "Events are viewable by community members" ON events;
CREATE POLICY "Events are viewable by community members" ON events
  FOR SELECT
  USING (
    deleted_at IS NULL AND
    auth.uid() IN (
      SELECT user_id FROM community_members 
      WHERE community_id = events.community_id
    )
  );

DROP POLICY IF EXISTS "Event creators can create events" ON events;
CREATE POLICY "Event creators can create events" ON events
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM community_members 
      WHERE community_id = events.community_id
    )
  );

DROP POLICY IF EXISTS "Event creators can update their events" ON events;
CREATE POLICY "Event creators can update their events" ON events
  FOR UPDATE
  USING (
    deleted_at IS NULL AND
    auth.uid() = created_by
  );

-- Resources: Update policies from is_active = true to deleted_at IS NULL
DROP POLICY IF EXISTS "Resources are viewable by community members" ON resources;
CREATE POLICY "Resources are viewable by community members" ON resources
  FOR SELECT
  USING (
    deleted_at IS NULL AND
    auth.uid() IN (
      SELECT user_id FROM community_members 
      WHERE community_id = resources.community_id
    )
  );

DROP POLICY IF EXISTS "Resource creators can create resources" ON resources;
CREATE POLICY "Resource creators can create resources" ON resources
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM community_members 
      WHERE community_id = resources.community_id
    )
  );

DROP POLICY IF EXISTS "Resource creators can update their resources" ON resources;
CREATE POLICY "Resource creators can update their resources" ON resources
  FOR UPDATE
  USING (
    deleted_at IS NULL AND
    auth.uid() = created_by
  );

-- Shoutouts: Add deleted_at IS NULL to all SELECT policies
DROP POLICY IF EXISTS "Shoutouts are viewable by community members" ON shoutouts;
CREATE POLICY "Shoutouts are viewable by community members" ON shoutouts
  FOR SELECT
  USING (
    deleted_at IS NULL AND
    auth.uid() IN (
      SELECT user_id FROM community_members 
      WHERE community_id = shoutouts.community_id
    )
  );

DROP POLICY IF EXISTS "Shoutout creators can create shoutouts" ON shoutouts;
CREATE POLICY "Shoutout creators can create shoutouts" ON shoutouts
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM community_members 
      WHERE community_id = shoutouts.community_id
    )
  );

DROP POLICY IF EXISTS "Shoutout creators can update their shoutouts" ON shoutouts;
CREATE POLICY "Shoutout creators can update their shoutouts" ON shoutouts
  FOR UPDATE
  USING (
    deleted_at IS NULL AND
    auth.uid() = created_by
  );

-- Conversations: Add deleted_at IS NULL to all SELECT policies
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
CREATE POLICY "Users can view their conversations" ON conversations
  FOR SELECT
  USING (
    deleted_at IS NULL AND
    (
      user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT
  WITH CHECK (
    user1_id = auth.uid() OR user2_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update their conversations" ON conversations;
CREATE POLICY "Users can update their conversations" ON conversations
  FOR UPDATE
  USING (
    deleted_at IS NULL AND
    (user1_id = auth.uid() OR user2_id = auth.uid())
  );

-- Direct Messages: Add deleted_at IS NULL to all SELECT policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON direct_messages;
CREATE POLICY "Users can view messages in their conversations" ON direct_messages
  FOR SELECT
  USING (
    deleted_at IS NULL AND
    conversation_id IN (
      SELECT id FROM conversations 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can send messages in their conversations" ON direct_messages;
CREATE POLICY "Users can send messages in their conversations" ON direct_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT id FROM conversations 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Message senders can update their messages" ON direct_messages;
CREATE POLICY "Message senders can update their messages" ON direct_messages
  FOR UPDATE
  USING (
    deleted_at IS NULL AND
    sender_id = auth.uid()
  );

-- Profiles: Ensure existing deleted_at IS NULL constraint is in place
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
CREATE POLICY "Profiles are viewable by authenticated users" ON profiles
  FOR SELECT
  USING (
    deleted_at IS NULL AND
    auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE
  USING (
    deleted_at IS NULL AND
    auth.uid() = id
  );

COMMIT;