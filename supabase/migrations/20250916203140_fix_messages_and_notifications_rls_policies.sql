-- Fix RLS policies for messages and notifications tables
-- Remove all existing overlapping and problematic policies and replace with simplified, secure ones

-- Drop all existing policies
DROP POLICY IF EXISTS "Participants can read messages" ON messages;
DROP POLICY IF EXISTS "Participants can view messages" ON messages;
DROP POLICY IF EXISTS "Users can view messages in conversations" ON messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Participants can send messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages in conversations" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;
DROP POLICY IF EXISTS "Users can edit their messages" ON messages;

-- Create new simplified, secure policies

-- 1. SELECT: Single unified policy for reading messages
CREATE POLICY "Users can view conversation messages" ON messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (
        -- Direct conversations: must be participant
        (c.conversation_type = 'direct' AND
         EXISTS (SELECT 1 FROM conversation_participants cp
                WHERE cp.conversation_id = c.id
                AND cp.user_id = auth.uid()))
        OR
        -- Community conversations: must be community member
        (c.conversation_type = 'community' AND
         c.community_id IS NOT NULL AND
         EXISTS (SELECT 1 FROM community_memberships cm
                WHERE cm.community_id = c.community_id
                AND cm.user_id = auth.uid()))
      )
    )
  );

-- 2. INSERT: Single secure policy with all validations
CREATE POLICY "Users can send messages to conversations" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Must be the actual sender
    sender_id = auth.uid()
    AND
    -- Must be participant/member
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (
        -- Direct conversations
        (c.conversation_type = 'direct'
         AND EXISTS (SELECT 1 FROM conversation_participants cp
                    WHERE cp.conversation_id = c.id
                    AND cp.user_id = auth.uid())
         -- Check for blocks in direct conversations
         AND NOT EXISTS (
           SELECT 1 FROM blocked_users bu
           WHERE (bu.blocker_id = auth.uid() AND
                  bu.blocked_id IN (
                    SELECT cp2.user_id FROM conversation_participants cp2
                    WHERE cp2.conversation_id = c.id
                    AND cp2.user_id != auth.uid()
                  ))
              OR (bu.blocked_id = auth.uid() AND
                  bu.blocker_id IN (
                    SELECT cp2.user_id FROM conversation_participants cp2
                    WHERE cp2.conversation_id = c.id
                    AND cp2.user_id != auth.uid()
                  ))
         ))
        OR
        -- Community conversations
        (c.conversation_type = 'community'
         AND c.community_id IS NOT NULL
         AND EXISTS (SELECT 1 FROM community_memberships cm
                    WHERE cm.community_id = c.community_id
                    AND cm.user_id = auth.uid()))
      )
    )
  );

-- 3. UPDATE: Users can only edit their own messages (includes soft delete)
CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- No DELETE policy - soft deletes are handled via UPDATE of is_deleted column

-- =====================================================
-- FIX NOTIFICATIONS TABLE RLS POLICIES
-- =====================================================

-- Drop all existing notifications policies
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "Allow authenticated notification creation" ON notifications;
DROP POLICY IF EXISTS "Allow notification creation from triggers" ON notifications;
DROP POLICY IF EXISTS "Allow postgres notification creation" ON notifications;
DROP POLICY IF EXISTS "Service role can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

-- Create new simplified, secure policies for notifications

-- 1. SELECT: Users can only view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 2. INSERT: Only system roles can create notifications (triggers, functions)
-- Service role for triggers/functions, authenticated for user-generated notifications
CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT TO service_role, authenticated
  WITH CHECK (
    -- Service role can create any notification (for triggers/system functions)
    (auth.role() = 'service_role')
    OR
    -- Authenticated users can only create notifications for themselves (if any user-generated cases exist)
    (auth.role() = 'authenticated' AND user_id = auth.uid())
  );

-- 3. UPDATE: Users can only update their own notifications (mark as read, etc.)
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- No DELETE policy - use soft deletes if needed via UPDATE