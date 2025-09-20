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

-- =====================================================
-- DATABASE STRUCTURE CHANGES FOR UNREAD COUNTS
-- =====================================================

-- 1. Add read_at column to conversation_participants table
ALTER TABLE conversation_participants
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- 2. Migrate existing data from conversation_status to conversation_participants
UPDATE conversation_participants cp
SET read_at = cs.last_read_at
FROM conversation_status cs
WHERE cp.conversation_id = cs.conversation_id
  AND cp.user_id = cs.user_id
  AND cp.read_at IS NULL; -- Only update if not already set

-- 3. Drop the conversation_status table as it's redundant
DROP TABLE IF EXISTS conversation_status;

-- 4. Update notification_details view to remove dependency on is_read column
DROP VIEW IF EXISTS notification_details;

-- 5. Remove redundant is_read column from notifications table
-- (We'll use read_at IS NOT NULL to determine if notification is read)
ALTER TABLE notifications
DROP COLUMN IF EXISTS is_read;

-- 6. Recreate notification_details view without is_read column
CREATE VIEW notification_details AS
SELECT
    n.id,
    n.user_id,
    n.type,
    n.resource_id,
    n.comment_id,
    n.claim_id,
    n.community_id,
    n.actor_id,
    n.metadata,
    n.read_at,
    n.created_at,
    n.updated_at,
    n.shoutout_id,
    up_actor.full_name AS actor_display_name,
    up_actor.avatar_url AS actor_avatar_url,
    r.title AS resource_title,
    r.type AS resource_type,
    c.name AS community_name,
    c.icon AS community_avatar_url,
    comm.content AS comment_content,
    s.message AS shoutout_message,
    rc.status AS claim_status,
    CASE
        WHEN n.claim_id IS NOT NULL THEN (
            SELECT jsonb_build_object(
                'resource_id', rc_1.resource_id,
                'timeslot_id', rc_1.timeslot_id,
                'status', rc_1.status,
                'commitment_level', rc_1.commitment_level,
                'resource_title', r_1.title,
                'resource_type', r_1.type,
                'claimant_name', pp.full_name,
                'owner_name', po.full_name
            )
            FROM resource_claims rc_1
            JOIN resources r_1 ON r_1.id = rc_1.resource_id
            JOIN public_profiles pp ON pp.id = rc_1.claimant_id
            JOIN public_profiles po ON po.id = r_1.owner_id
            WHERE rc_1.id = n.claim_id
        )
        ELSE NULL::jsonb
    END AS claim_details
FROM notifications n
LEFT JOIN public_profiles up_actor ON n.actor_id = up_actor.id
LEFT JOIN resources r ON n.resource_id = r.id
LEFT JOIN communities c ON n.community_id = c.id
LEFT JOIN comments comm ON n.comment_id = comm.id
LEFT JOIN shoutouts s ON n.shoutout_id = s.id
LEFT JOIN resource_claims rc ON n.claim_id = rc.id;

-- 7. Update database functions to use conversation_participants instead of conversation_status

-- Drop and recreate mark_conversation_as_read function
DROP FUNCTION IF EXISTS mark_conversation_as_read(UUID);

CREATE OR REPLACE FUNCTION mark_conversation_as_read(p_conversation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID;
BEGIN
  v_current_user_id := auth.uid();

  -- Update conversation_participants setting read_at to NOW()
  UPDATE conversation_participants
  SET read_at = NOW()
  WHERE conversation_id = p_conversation_id
    AND user_id = v_current_user_id;

  -- If no row was updated, the user is not a participant
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User is not a participant in this conversation';
  END IF;
END;
$$;

-- Drop the trigger and recreate update_conversation_on_message function
DROP TRIGGER IF EXISTS on_new_message ON messages;
DROP FUNCTION IF EXISTS update_conversation_on_message();

CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update conversation metadata
  UPDATE conversations
  SET
    last_message_at = NEW.created_at,
    last_message_preview = CASE
      WHEN NEW.is_deleted THEN '[Message deleted]'
      ELSE LEFT(NEW.content, 100)
    END,
    last_message_sender_id = NEW.sender_id,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;

  -- No need to update conversation_status since it's been removed
  -- Message read tracking is now handled via conversation_participants.read_at

  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();