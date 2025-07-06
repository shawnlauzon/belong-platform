-- Migration: Fix missing tables and columns required by other migrations
-- This creates the community_memberships table and adds missing columns

BEGIN;

-- Create community_memberships table if it doesn't exist
CREATE TABLE IF NOT EXISTS community_memberships (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, community_id)
);

-- No additional columns needed - using existing organizer_id, owner_id, from_user_id columns

-- Enable RLS on community_memberships
ALTER TABLE community_memberships ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for community_memberships
CREATE POLICY "Community memberships are viewable by members" ON community_memberships
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    auth.uid() IN (
      SELECT organizer_id FROM communities 
      WHERE id = community_id
    )
  );

CREATE POLICY "Users can join communities" ON community_memberships
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave communities" ON community_memberships
  FOR DELETE
  USING (auth.uid() = user_id);

COMMIT;