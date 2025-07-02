-- Migration: Standardize soft deletion across all tables using only `deleted_at`
-- This removes `is_active` columns and adds `deleted_at` + `deleted_by` where missing

BEGIN;

-- Communities table: remove is_active column, keep deleted_at and deleted_by
ALTER TABLE communities DROP COLUMN IF EXISTS is_active;

-- Events table: remove is_active, add deleted_at and deleted_by
ALTER TABLE events DROP COLUMN IF EXISTS is_active;
ALTER TABLE events ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE events ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Resources table: remove is_active, add deleted_at and deleted_by  
ALTER TABLE resources DROP COLUMN IF EXISTS is_active;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Shoutouts table: add deleted_at and deleted_by
ALTER TABLE shoutouts ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE shoutouts ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Conversations table: add deleted_at and deleted_by
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Direct messages table: add deleted_at and deleted_by
ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Profiles table: add deleted_at (profiles don't need deleted_by since they're self-deleting)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Create indexes on deleted_at columns for performance
CREATE INDEX IF NOT EXISTS idx_communities_deleted_at ON communities(deleted_at);
CREATE INDEX IF NOT EXISTS idx_events_deleted_at ON events(deleted_at);
CREATE INDEX IF NOT EXISTS idx_resources_deleted_at ON resources(deleted_at);
CREATE INDEX IF NOT EXISTS idx_shoutouts_deleted_at ON shoutouts(deleted_at);
CREATE INDEX IF NOT EXISTS idx_conversations_deleted_at ON conversations(deleted_at);
CREATE INDEX IF NOT EXISTS idx_direct_messages_deleted_at ON direct_messages(deleted_at);
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at);

COMMIT;