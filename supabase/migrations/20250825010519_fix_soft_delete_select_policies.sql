-- Fix soft delete issues for comments and messages
-- The problem: When updating is_deleted = true, PostgreSQL RLS checks if the user
-- can still SELECT the row after the update. Since the original SELECT policies
-- have NOT is_deleted conditions, users can't see their own deleted items,
-- causing the UPDATE to fail with "new row violates row-level security policy"

-- Allow users to always see their own comments (including deleted ones)
-- This enables them to perform soft deletes
CREATE POLICY "Users can view their own comments" ON comments
  FOR SELECT
  USING (auth.uid() = author_id);

-- Allow users to always see their own messages (including deleted ones)
-- This enables them to perform soft deletes
CREATE POLICY "Users can view their own messages" ON messages
  FOR SELECT
  USING (auth.uid() = sender_id);