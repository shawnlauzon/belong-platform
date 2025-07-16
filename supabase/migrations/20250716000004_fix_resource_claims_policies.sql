-- Migration: Fix resource claims policies to match desired permission structure
-- This migration updates resource_claims INSERT and UPDATE policies to ensure:
-- INSERT - community members can create claims for resources in their communities
-- UPDATE - resource owners OR claim users can update claims

BEGIN;

-- ==============================================================================
-- RESOURCE_CLAIMS TABLE - INSERT POLICY
-- ==============================================================================
-- Replace simple auth check with community membership requirement

DROP POLICY IF EXISTS "Authenticated users can create resource claims" ON resource_claims;

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

-- ==============================================================================
-- RESOURCE_CLAIMS TABLE - UPDATE POLICY
-- ==============================================================================
-- Consolidate two separate UPDATE policies into one allowing both resource owners OR claim users

DROP POLICY IF EXISTS "Resource owners can update claims on their resources" ON resource_claims;
DROP POLICY IF EXISTS "Users can update their own resource claims" ON resource_claims;

CREATE POLICY "Resource owners or claim users can update claims" ON resource_claims
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    auth.uid() IN (
      SELECT owner_id FROM resources 
      WHERE id = resource_claims.resource_id
    )
  );

COMMIT;