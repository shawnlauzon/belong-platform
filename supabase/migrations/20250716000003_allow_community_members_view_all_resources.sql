-- Migration: Allow community members to view all resources, resource_claims, and resource_timeslots
-- This migration updates RLS policies to ensure all community members can view all resources,
-- resource claims, and resource timeslots within their communities.

BEGIN;

-- ==============================================================================
-- RESOURCE_CLAIMS TABLE
-- ==============================================================================
-- Replace complex policy with simple community member access

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view resource claims" ON resource_claims;
DROP POLICY IF EXISTS "Resource owners can view claims on their resources" ON resource_claims;

-- Create new policy allowing all community members to view resource claims
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

-- ==============================================================================
-- RESOURCE_TIMESLOTS TABLE
-- ==============================================================================
-- Replace owner/organizer-only policy with community member access

-- Drop existing policy
DROP POLICY IF EXISTS "Allow viewing resource timeslots" ON resource_timeslots;

-- Create new policy allowing all community members to view resource timeslots
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

COMMIT;