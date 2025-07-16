-- Migration: Add RLS policies for resource owners to view and update resource claims
-- This migration adds policies to allow resource owners to view and update resource claims
-- against resources they own, enabling them to manage claim approvals and status changes.

BEGIN;

-- Add policy for resource owners to view resource claims on their resources
CREATE POLICY "Resource owners can view claims on their resources" ON resource_claims
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT owner_id FROM resources 
      WHERE id = resource_claims.resource_id
    )
  );

-- Add policy for resource owners to update resource claims on their resources
CREATE POLICY "Resource owners can update claims on their resources" ON resource_claims
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT owner_id FROM resources 
      WHERE id = resource_claims.resource_id
    )
  );

COMMIT;