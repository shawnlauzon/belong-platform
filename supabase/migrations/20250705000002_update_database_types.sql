-- Migration: Apply final database schema to match expected types
-- This ensures the database matches the current codebase expectations

BEGIN;

-- Ensure community_memberships has the correct structure (no roles based on recent changes)
-- Remove role column since we simplified memberships
ALTER TABLE community_memberships DROP COLUMN IF EXISTS role;

-- Ensure all required indexes exist
CREATE INDEX IF NOT EXISTS idx_community_memberships_user_id ON community_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_community_memberships_community_id ON community_memberships(community_id);

-- Ensure all required data is consistent

COMMIT;