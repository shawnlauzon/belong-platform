-- Migration: Fix RLS policies missing TO authenticated clauses
-- This migration adds the missing TO authenticated clauses to resource-related policies
-- and fixes community memberships to allow public access

BEGIN;

-- ==============================================================================
-- RESOURCE-RELATED POLICIES - ADD MISSING TO authenticated CLAUSES
-- ==============================================================================

-- Fix resource_claims policies
DROP POLICY IF EXISTS "community_members_can_create_resource_claims" ON resource_claims;
CREATE POLICY "community_members_can_create_resource_claims" ON resource_claims
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM resources r
      JOIN resource_communities rc ON r.id = rc.resource_id
      JOIN community_memberships cm ON rc.community_id = cm.community_id
      WHERE r.id = resource_claims.resource_id 
        AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "community_members_can_view_resource_claims" ON resource_claims;
CREATE POLICY "community_members_can_view_resource_claims" ON resource_claims
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM resources r
      JOIN resource_communities rc ON r.id = rc.resource_id
      JOIN community_memberships cm ON rc.community_id = cm.community_id
      WHERE r.id = resource_claims.resource_id 
        AND cm.user_id = auth.uid()
    )
  );

-- Fix resource_responses policies
DROP POLICY IF EXISTS "community_members_can_create_resource_responses" ON resource_responses;
CREATE POLICY "community_members_can_create_resource_responses" ON resource_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM resources r
      JOIN resource_communities rc ON r.id = rc.resource_id
      JOIN community_memberships cm ON rc.community_id = cm.community_id
      WHERE r.id = resource_responses.resource_id 
        AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "community_members_can_view_resource_responses" ON resource_responses;
CREATE POLICY "community_members_can_view_resource_responses" ON resource_responses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM resources r
      JOIN resource_communities rc ON r.id = rc.resource_id
      JOIN community_memberships cm ON rc.community_id = cm.community_id
      WHERE r.id = resource_responses.resource_id 
        AND cm.user_id = auth.uid()
    )
  );

-- Fix resources policies
DROP POLICY IF EXISTS "community_members_can_create_resources" ON resources;
CREATE POLICY "community_members_can_create_resources" ON resources
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "community_members_can_view_resources" ON resources;
CREATE POLICY "community_members_can_view_resources" ON resources
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM resource_communities rc
      JOIN community_memberships cm ON rc.community_id = cm.community_id
      WHERE rc.resource_id = resources.id 
        AND cm.user_id = auth.uid()
    )
  );

-- Fix resource_timeslots policies
DROP POLICY IF EXISTS "community_members_can_view_resource_timeslots" ON resource_timeslots;
CREATE POLICY "community_members_can_view_resource_timeslots" ON resource_timeslots
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM resources r
      JOIN resource_communities rc ON r.id = rc.resource_id
      JOIN community_memberships cm ON rc.community_id = cm.community_id
      WHERE r.id = resource_timeslots.resource_id 
        AND cm.user_id = auth.uid()
    )
  );

-- ==============================================================================
-- COMMUNITY MEMBERSHIPS - ALLOW PUBLIC ACCESS
-- ==============================================================================

-- Fix community memberships to allow public read access (remove TO authenticated)
DROP POLICY IF EXISTS "Users can view community memberships" ON community_memberships;
CREATE POLICY "Public can view community memberships" ON community_memberships
  FOR SELECT
  USING (true);

COMMIT;