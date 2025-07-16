-- Migration: Enforce authentication for all operations except reading communities
-- This migration updates RLS policies to require authentication for all operations,
-- with the exception of allowing anonymous read access to communities table

BEGIN;

-- ==============================================================================
-- COMMUNITIES TABLE
-- ==============================================================================
-- Keep public read access for communities, but require authentication for all other operations

-- Allow anonymous users to read communities (discovery use case)
DROP POLICY IF EXISTS "Communities are viewable by everyone" ON communities;
DROP POLICY IF EXISTS "Communities are viewable by members" ON communities;
CREATE POLICY "Communities are publicly viewable" ON communities
  FOR SELECT
  TO public
  USING (true);

-- Require authentication for creating communities
DROP POLICY IF EXISTS "Community creators can create communities" ON communities;
DROP POLICY IF EXISTS "Authenticated users can create communities" ON communities;
CREATE POLICY "Authenticated users can create communities" ON communities
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = organizer_id);

-- Require authentication for updating communities
DROP POLICY IF EXISTS "Community owners can update their communities" ON communities;
DROP POLICY IF EXISTS "Organizers can update their communities" ON communities;
CREATE POLICY "Community organizers can update their communities" ON communities
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = organizer_id);

-- Require authentication for deleting communities
DROP POLICY IF EXISTS "Organizers can delete their communities" ON communities;
CREATE POLICY "Community organizers can delete their communities" ON communities
  FOR DELETE
  TO authenticated
  USING (auth.uid() = organizer_id);

-- ==============================================================================
-- PROFILES TABLE
-- ==============================================================================
-- Remove public access, require authentication for all operations

-- Remove public read access to profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
CREATE POLICY "Authenticated users can view profiles" ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Keep existing policy for users updating their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Keep service role insert policy for profile creation
DROP POLICY IF EXISTS "Allow service role to insert profiles" ON profiles;
CREATE POLICY "Service role can insert profiles" ON profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Keep user insert policy
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Authenticated users can insert their own profile" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ==============================================================================
-- RESOURCES TABLE
-- ==============================================================================
-- Remove public access, require authentication for all operations

-- Remove public read access to resources
DROP POLICY IF EXISTS "Resources are viewable by everyone" ON resources;
DROP POLICY IF EXISTS "Resources are viewable by community members" ON resources;
CREATE POLICY "Community members can view resources" ON resources
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM community_memberships 
      WHERE community_id = resources.community_id
    )
  );

-- Require authentication for creating resources
DROP POLICY IF EXISTS "Users can insert their own resources" ON resources;
DROP POLICY IF EXISTS "Resource creators can create resources" ON resources;
CREATE POLICY "Community members can create resources" ON resources
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = owner_id AND
    auth.uid() IN (
      SELECT user_id FROM community_memberships 
      WHERE community_id = resources.community_id
    )
  );

-- Require authentication for updating resources
DROP POLICY IF EXISTS "Users can update their own resources" ON resources;
DROP POLICY IF EXISTS "Resource creators can update their resources" ON resources;
CREATE POLICY "Resource owners can update their resources" ON resources
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Require authentication for deleting resources
DROP POLICY IF EXISTS "Users can delete their own resources" ON resources;
CREATE POLICY "Resource owners can delete their resources" ON resources
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- ==============================================================================
-- SHOUTOUTS TABLE
-- ==============================================================================
-- Remove public access, require authentication for all operations

-- Remove public read access to shoutouts
DROP POLICY IF EXISTS "Thanks are viewable by everyone" ON shoutouts;
DROP POLICY IF EXISTS "Shoutouts are viewable by everyone" ON shoutouts;
DROP POLICY IF EXISTS "Shoutouts are viewable by community members" ON shoutouts;
CREATE POLICY "Community members can view shoutouts" ON shoutouts
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM community_memberships 
      WHERE community_id = shoutouts.community_id
    )
  );

-- Require authentication for creating shoutouts
DROP POLICY IF EXISTS "Authenticated users can create thanks" ON shoutouts;
DROP POLICY IF EXISTS "Shoutout creators can create shoutouts" ON shoutouts;
CREATE POLICY "Community members can create shoutouts" ON shoutouts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = from_user_id AND
    auth.uid() IN (
      SELECT user_id FROM community_memberships 
      WHERE community_id = shoutouts.community_id
    )
  );

-- Require authentication for updating shoutouts
DROP POLICY IF EXISTS "Users can update their own thanks" ON shoutouts;
DROP POLICY IF EXISTS "Shoutout creators can update their shoutouts" ON shoutouts;
CREATE POLICY "Shoutout creators can update their shoutouts" ON shoutouts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = from_user_id);

-- Require authentication for deleting shoutouts
DROP POLICY IF EXISTS "Users can delete their own thanks" ON shoutouts;
CREATE POLICY "Shoutout creators can delete their shoutouts" ON shoutouts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = from_user_id);

-- ==============================================================================
-- COMMUNITY_MEMBERSHIPS TABLE
-- ==============================================================================
-- Ensure all operations require authentication

-- Enable RLS if not already enabled
ALTER TABLE community_memberships ENABLE ROW LEVEL SECURITY;

-- Community members can view memberships in their communities
DROP POLICY IF EXISTS "Community members can view memberships" ON community_memberships;
CREATE POLICY "Community members can view memberships" ON community_memberships
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    auth.uid() IN (
      SELECT user_id FROM community_memberships cm
      WHERE cm.community_id = community_memberships.community_id
    )
  );

-- Users can create their own memberships (join communities)
DROP POLICY IF EXISTS "Users can join communities" ON community_memberships;
CREATE POLICY "Authenticated users can join communities" ON community_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own memberships (leave communities)
DROP POLICY IF EXISTS "Users can leave communities" ON community_memberships;
CREATE POLICY "Users can leave communities" ON community_memberships
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Community organizers can remove members
DROP POLICY IF EXISTS "Organizers can remove members" ON community_memberships;
CREATE POLICY "Community organizers can remove members" ON community_memberships
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT organizer_id FROM communities 
      WHERE id = community_memberships.community_id
    )
  );

-- ==============================================================================
-- RESOURCE_CLAIMS TABLE
-- ==============================================================================
-- Ensure all operations require authentication

-- Enable RLS if not already enabled
ALTER TABLE resource_claims ENABLE ROW LEVEL SECURITY;

-- Community members can view claims for resources in their communities
DROP POLICY IF EXISTS "Community members can view resource claims" ON resource_claims;
CREATE POLICY "Community members can view resource claims" ON resource_claims
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT cm.user_id FROM community_memberships cm
      JOIN resources r ON r.community_id = cm.community_id
      WHERE r.id = resource_claims.resource_id
    )
  );

-- Authenticated users can create claims for resources in communities they belong to
DROP POLICY IF EXISTS "Community members can create resource claims" ON resource_claims;
CREATE POLICY "Community members can create resource claims" ON resource_claims
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    auth.uid() IN (
      SELECT cm.user_id FROM community_memberships cm
      JOIN resources r ON r.community_id = cm.community_id
      WHERE r.id = resource_claims.resource_id
    )
  );

-- Users can update their own claims
DROP POLICY IF EXISTS "Users can update their own resource claims" ON resource_claims;
CREATE POLICY "Users can update their own resource claims" ON resource_claims
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own claims
DROP POLICY IF EXISTS "Users can delete their own resource claims" ON resource_claims;
CREATE POLICY "Users can delete their own resource claims" ON resource_claims
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ==============================================================================
-- RESOURCE_TIMESLOTS TABLE
-- ==============================================================================
-- Ensure all operations require authentication

-- Enable RLS if not already enabled
ALTER TABLE resource_timeslots ENABLE ROW LEVEL SECURITY;

-- Community members can view timeslots for resources in their communities
DROP POLICY IF EXISTS "Community members can view resource timeslots" ON resource_timeslots;
CREATE POLICY "Community members can view resource timeslots" ON resource_timeslots
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT cm.user_id FROM community_memberships cm
      JOIN resources r ON r.community_id = cm.community_id
      WHERE r.id = resource_timeslots.resource_id
    )
  );

-- Resource owners can create timeslots for their resources
DROP POLICY IF EXISTS "Resource owners can create timeslots" ON resource_timeslots;
CREATE POLICY "Resource owners can create timeslots" ON resource_timeslots
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT owner_id FROM resources 
      WHERE id = resource_timeslots.resource_id
    )
  );

-- Resource owners can update timeslots for their resources
DROP POLICY IF EXISTS "Resource owners can update timeslots" ON resource_timeslots;
CREATE POLICY "Resource owners can update timeslots" ON resource_timeslots
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT owner_id FROM resources 
      WHERE id = resource_timeslots.resource_id
    )
  );

-- Resource owners can delete timeslots for their resources
DROP POLICY IF EXISTS "Resource owners can delete timeslots" ON resource_timeslots;
CREATE POLICY "Resource owners can delete timeslots" ON resource_timeslots
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT owner_id FROM resources 
      WHERE id = resource_timeslots.resource_id
    )
  );

-- ==============================================================================
-- RESOURCE_RESPONSES TABLE
-- ==============================================================================
-- Ensure all operations require authentication

-- Enable RLS if not already enabled
ALTER TABLE resource_responses ENABLE ROW LEVEL SECURITY;

-- Community members can view responses for resources in their communities
DROP POLICY IF EXISTS "Community members can view resource responses" ON resource_responses;
CREATE POLICY "Community members can view resource responses" ON resource_responses
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT cm.user_id FROM community_memberships cm
      JOIN resources r ON r.community_id = cm.community_id
      WHERE r.id = resource_responses.resource_id
    )
  );

-- Community members can create responses for resources in their communities
DROP POLICY IF EXISTS "Community members can create resource responses" ON resource_responses;
CREATE POLICY "Community members can create resource responses" ON resource_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    auth.uid() IN (
      SELECT cm.user_id FROM community_memberships cm
      JOIN resources r ON r.community_id = cm.community_id
      WHERE r.id = resource_responses.resource_id
    )
  );

-- Users can update their own responses
DROP POLICY IF EXISTS "Users can update their own resource responses" ON resource_responses;
CREATE POLICY "Users can update their own resource responses" ON resource_responses
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own responses
DROP POLICY IF EXISTS "Users can delete their own resource responses" ON resource_responses;
CREATE POLICY "Users can delete their own resource responses" ON resource_responses
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ==============================================================================
-- NOTIFICATIONS TABLE
-- ==============================================================================
-- Ensure all operations require authentication

-- Enable RLS if not already enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- System can create notifications for any user (service role)
DROP POLICY IF EXISTS "Service role can create notifications" ON notifications;
CREATE POLICY "Service role can create notifications" ON notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own notifications
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
CREATE POLICY "Users can delete their own notifications" ON notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ==============================================================================
-- STORAGE BUCKET POLICIES
-- ==============================================================================
-- Update storage policies to require authentication for uploads while keeping read public

-- Note: Storage policies are managed differently, this is a reminder to update them separately
-- The storage policies should be:
-- 1. Public read access for discovery (SELECT)
-- 2. Authenticated upload/delete access (INSERT/UPDATE/DELETE)

COMMIT;