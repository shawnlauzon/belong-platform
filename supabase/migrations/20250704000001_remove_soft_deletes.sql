-- Migration: Remove soft delete infrastructure and implement hard deletes
-- This removes deleted_at/deleted_by columns and updates RLS policies

BEGIN;

-- Drop indexes on deleted_at columns first
DROP INDEX IF EXISTS idx_communities_deleted_at;
DROP INDEX IF EXISTS idx_events_deleted_at;
DROP INDEX IF EXISTS idx_resources_deleted_at;
DROP INDEX IF EXISTS idx_shoutouts_deleted_at;
DROP INDEX IF EXISTS idx_conversations_deleted_at;
DROP INDEX IF EXISTS idx_direct_messages_deleted_at;
DROP INDEX IF EXISTS idx_profiles_deleted_at;

-- Remove deleted_at and deleted_by columns from all tables
ALTER TABLE communities DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE communities DROP COLUMN IF EXISTS deleted_by;

ALTER TABLE events DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE events DROP COLUMN IF EXISTS deleted_by;

ALTER TABLE resources DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE resources DROP COLUMN IF EXISTS deleted_by;

ALTER TABLE shoutouts DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE shoutouts DROP COLUMN IF EXISTS deleted_by;

ALTER TABLE conversations DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE conversations DROP COLUMN IF EXISTS deleted_by;

ALTER TABLE direct_messages DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE direct_messages DROP COLUMN IF EXISTS deleted_by;

ALTER TABLE profiles DROP COLUMN IF EXISTS deleted_at;

-- Update RLS policies to remove deleted_at checks

-- Communities: Remove deleted_at IS NULL from policies
DROP POLICY IF EXISTS "Communities are viewable by members" ON communities;
CREATE POLICY "Communities are viewable by members" ON communities
  FOR SELECT
  USING (
    visibility = 'public' OR
    auth.uid() IN (
      SELECT user_id FROM community_members 
      WHERE community_id = communities.id
    )
  );

DROP POLICY IF EXISTS "Community owners can update their communities" ON communities;
CREATE POLICY "Community owners can update their communities" ON communities
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Events: Remove deleted_at IS NULL from policies
DROP POLICY IF EXISTS "Events are viewable by community members" ON events;
CREATE POLICY "Events are viewable by community members" ON events
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM community_members 
      WHERE community_id = events.community_id
    )
  );

DROP POLICY IF EXISTS "Event creators can update their events" ON events;
CREATE POLICY "Event creators can update their events" ON events
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Resources: Remove deleted_at IS NULL from policies
DROP POLICY IF EXISTS "Resources are viewable by community members" ON resources;
CREATE POLICY "Resources are viewable by community members" ON resources
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM community_members 
      WHERE community_id = resources.community_id
    )
  );

DROP POLICY IF EXISTS "Resource creators can update their resources" ON resources;
CREATE POLICY "Resource creators can update their resources" ON resources
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Shoutouts: Remove deleted_at IS NULL from policies
DROP POLICY IF EXISTS "Shoutouts are viewable by community members" ON shoutouts;
CREATE POLICY "Shoutouts are viewable by community members" ON shoutouts
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM community_members 
      WHERE community_id = shoutouts.community_id
    )
  );

DROP POLICY IF EXISTS "Shoutout creators can update their shoutouts" ON shoutouts;
CREATE POLICY "Shoutout creators can update their shoutouts" ON shoutouts
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Conversations: Remove deleted_at IS NULL from policies
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
CREATE POLICY "Users can view their conversations" ON conversations
  FOR SELECT
  USING (
    user1_id = auth.uid() OR user2_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update their conversations" ON conversations;
CREATE POLICY "Users can update their conversations" ON conversations
  FOR UPDATE
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

-- Direct Messages: Remove deleted_at IS NULL from policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON direct_messages;
CREATE POLICY "Users can view messages in their conversations" ON direct_messages
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM conversations 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Message senders can update their messages" ON direct_messages;
CREATE POLICY "Message senders can update their messages" ON direct_messages
  FOR UPDATE
  USING (sender_id = auth.uid());

-- Profiles: Remove deleted_at IS NULL from policies
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
CREATE POLICY "Profiles are viewable by authenticated users" ON profiles
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

COMMIT;