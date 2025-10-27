-- Push Notification System and Notification Redesign
-- This migration implements:
-- 1. Updated notification_type enum with new types
-- 2. notification_preferences table for per-type preferences
-- 3. push_subscriptions table for Web Push subscriptions
-- 4. Updated notification triggers
-- 5. Push notification delivery functions

-- ============================================================================
-- STEP 1: Drop notification_details view (will recreate later)
-- ============================================================================

DROP VIEW IF EXISTS notification_details;

-- ============================================================================
-- STEP 2: Update notification_type enum
-- ============================================================================

-- First, convert columns and functions using the enum to use text temporarily

-- Convert trust_score_logs.action_type to text
ALTER TABLE trust_score_logs
  ALTER COLUMN action_type TYPE TEXT
  USING action_type::text;

-- Convert notifications.type to text
ALTER TABLE notifications
  ALTER COLUMN type TYPE TEXT
  USING (
    CASE type::text
      -- Map old types to new types
      WHEN 'comment.created' THEN 'resource.commented'
      WHEN 'claim.approved' THEN 'claim.responded'
      WHEN 'claim.rejected' THEN 'claim.responded'
      WHEN 'claim.completed' THEN 'resource.received'
      WHEN 'resource.cancelled' THEN 'event.cancelled'
      WHEN 'conversation.created' THEN 'conversation.requested'
      WHEN 'message.created' THEN 'message.received'
      WHEN 'shoutout.created' THEN 'shoutout.received'
      WHEN 'member.joined' THEN 'membership.updated'
      WHEN 'member.left' THEN 'membership.updated'
      -- Keep types that exist in both
      WHEN 'comment.replied' THEN 'comment.replied'
      WHEN 'claim.created' THEN 'claim.created'
      WHEN 'resource.created' THEN 'resource.created'
      WHEN 'event.created' THEN 'event.created'
      WHEN 'resource.updated' THEN 'resource.updated'
      WHEN 'trustlevel.changed' THEN 'trustlevel.changed'
      WHEN 'claim.cancelled' THEN 'claim.cancelled'
      -- Default for any unmapped types
      ELSE 'resource.updated'
    END
  );

-- Drop functions that depend on the enum
DROP FUNCTION IF EXISTS create_notification_base(UUID, notification_type, UUID, UUID, UUID, UUID, UUID, UUID, UUID, JSONB);
DROP FUNCTION IF EXISTS update_trust_score(UUID, UUID, notification_type, UUID, INTEGER, JSONB);

-- Drop old enum
DROP TYPE notification_type;

-- Create new enum with all notification types
CREATE TYPE notification_type AS ENUM (
  -- Keep existing
  'comment.replied',
  'claim.created',
  'resource.created',
  'event.created',
  'resource.updated',
  'trustlevel.changed',
  -- Add new
  'resource.commented',
  'claim.cancelled',
  'claim.responded',
  'resource.given',
  'resource.received',
  'event.updated',
  'event.cancelled',
  'resource.expiring',
  'event.starting',
  'membership.updated',
  'conversation.requested',
  'message.received',
  'shoutout.received'
);

-- Convert columns back to new enum
ALTER TABLE notifications
  ALTER COLUMN type TYPE notification_type
  USING type::notification_type;

ALTER TABLE trust_score_logs
  ALTER COLUMN action_type TYPE notification_type
  USING action_type::notification_type;

-- Recreate create_notification_base function
CREATE OR REPLACE FUNCTION create_notification_base(
  p_user_id UUID,
  p_type notification_type,
  p_actor_id UUID DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_comment_id UUID DEFAULT NULL,
  p_claim_id UUID DEFAULT NULL,
  p_shoutout_id UUID DEFAULT NULL,
  p_community_id UUID DEFAULT NULL,
  p_conversation_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    actor_id,
    resource_id,
    comment_id,
    claim_id,
    shoutout_id,
    community_id,
    conversation_id,
    metadata
  ) VALUES (
    p_user_id,
    p_type,
    p_actor_id,
    p_resource_id,
    p_comment_id,
    p_claim_id,
    p_shoutout_id,
    p_community_id,
    p_conversation_id,
    p_metadata
  )
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$;

-- Recreate update_trust_score function
CREATE OR REPLACE FUNCTION update_trust_score(
  p_user_id UUID,
  p_community_id UUID,
  p_action_type notification_type,
  p_related_user_id UUID DEFAULT NULL,
  p_points INTEGER DEFAULT 0,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_score INTEGER;
  v_current_level INTEGER;
  v_new_score INTEGER;
  v_new_level INTEGER;
BEGIN
  -- Get current score
  SELECT score, level INTO v_current_score, v_current_level
  FROM trust_scores
  WHERE user_id = p_user_id AND community_id = p_community_id;

  -- Calculate new score
  v_new_score := GREATEST(0, v_current_score + p_points);

  -- Calculate new level (simple formula: level = floor(score / 100))
  v_new_level := FLOOR(v_new_score / 100);

  -- Update trust score
  UPDATE trust_scores
  SET
    score = v_new_score,
    level = v_new_level,
    last_calculated_at = NOW()
  WHERE user_id = p_user_id AND community_id = p_community_id;

  -- Log the change
  INSERT INTO trust_score_logs (
    user_id,
    community_id,
    action_type,
    related_user_id,
    points_change,
    score_before,
    score_after,
    metadata
  ) VALUES (
    p_user_id,
    p_community_id,
    p_action_type,
    p_related_user_id,
    p_points,
    v_current_score,
    v_new_score,
    p_metadata
  );

  -- Create notification if level changed
  IF v_new_level != v_current_level THEN
    PERFORM create_notification_base(
      p_user_id := p_user_id,
      p_type := 'trustlevel.changed',
      p_community_id := p_community_id,
      p_metadata := jsonb_build_object(
        'old_level', v_current_level,
        'new_level', v_new_level
      )
    );
  END IF;
END;
$$;

-- ============================================================================
-- STEP 3: Create notification_preferences table
-- ============================================================================

CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Global switches
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT false,

  -- Per-type preferences (JSONB with {in_app: boolean, push: boolean, email: boolean})
  "comment.replied" JSONB NOT NULL DEFAULT '{"in_app": true, "push": true, "email": false}'::jsonb,
  "claim.created" JSONB NOT NULL DEFAULT '{"in_app": true, "push": true, "email": false}'::jsonb,
  "resource.created" JSONB NOT NULL DEFAULT '{"in_app": true, "push": true, "email": false}'::jsonb,
  "event.created" JSONB NOT NULL DEFAULT '{"in_app": true, "push": true, "email": false}'::jsonb,
  "resource.updated" JSONB NOT NULL DEFAULT '{"in_app": true, "push": true, "email": false}'::jsonb,
  "trustlevel.changed" JSONB NOT NULL DEFAULT '{"in_app": true, "push": true, "email": false}'::jsonb,
  "resource.commented" JSONB NOT NULL DEFAULT '{"in_app": true, "push": true, "email": false}'::jsonb,
  "claim.cancelled" JSONB NOT NULL DEFAULT '{"in_app": true, "push": true, "email": false}'::jsonb,
  "claim.responded" JSONB NOT NULL DEFAULT '{"in_app": true, "push": true, "email": false}'::jsonb,
  "resource.given" JSONB NOT NULL DEFAULT '{"in_app": true, "push": true, "email": false}'::jsonb,
  "resource.received" JSONB NOT NULL DEFAULT '{"in_app": true, "push": true, "email": false}'::jsonb,
  "event.updated" JSONB NOT NULL DEFAULT '{"in_app": true, "push": true, "email": false}'::jsonb,
  "event.cancelled" JSONB NOT NULL DEFAULT '{"in_app": true, "push": true, "email": false}'::jsonb,
  "resource.expiring" JSONB NOT NULL DEFAULT '{"in_app": true, "push": true, "email": false}'::jsonb,
  "event.starting" JSONB NOT NULL DEFAULT '{"in_app": true, "push": true, "email": false}'::jsonb,
  "membership.updated" JSONB NOT NULL DEFAULT '{"in_app": true, "push": true, "email": false}'::jsonb,
  "conversation.requested" JSONB NOT NULL DEFAULT '{"in_app": true, "push": true, "email": false}'::jsonb,
  "message.received" JSONB NOT NULL DEFAULT '{"in_app": true, "push": true, "email": false}'::jsonb,
  "shoutout.received" JSONB NOT NULL DEFAULT '{"in_app": true, "push": true, "email": false}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT notification_preferences_user_id_key UNIQUE(user_id)
);

-- Add RLS policies
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER set_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create default preferences for all existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Drop old notification_preferences column from profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS notification_preferences;

-- ============================================================================
-- STEP 4: Create push_subscriptions table
-- ============================================================================

CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT push_subscriptions_user_endpoint_key UNIQUE(user_id, endpoint)
);

-- Add index for faster lookups
CREATE INDEX push_subscriptions_user_id_idx ON push_subscriptions(user_id);

-- Add RLS policies
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER set_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 5: Push notification helper functions
-- ============================================================================

-- Helper function to check if push should be sent
CREATE OR REPLACE FUNCTION should_send_push(
  p_user_id UUID,
  p_type notification_type
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  prefs RECORD;
  type_pref JSONB;
BEGIN
  -- Get user preferences
  SELECT * INTO prefs
  FROM notification_preferences
  WHERE user_id = p_user_id;

  -- If no preferences or push disabled globally, don't send
  IF prefs IS NULL OR prefs.push_enabled = false THEN
    RETURN false;
  END IF;

  -- Special case: event.cancelled always sends if push is enabled globally
  IF p_type = 'event.cancelled' THEN
    RETURN true;
  END IF;

  -- Get type-specific preference
  EXECUTE format('SELECT $1.%I', p_type::text) INTO type_pref USING prefs;

  -- Check if push is enabled for this type
  RETURN (type_pref->>'push')::boolean = true;
END;
$$;

-- Function to send push notification asynchronously
CREATE OR REPLACE FUNCTION send_push_notification_async(
  p_user_id UUID,
  p_notification_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_body TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if should send push
  IF NOT should_send_push(p_user_id, p_type) THEN
    RETURN;
  END IF;

  -- Call Edge Function via pg_net (non-blocking)
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
    ),
    body := jsonb_build_object(
      'user_id', p_user_id,
      'notification_id', p_notification_id,
      'type', p_type,
      'title', p_title,
      'body', p_body,
      'metadata', p_metadata
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Failed to send push notification: %', SQLERRM;
END;
$$;

-- ============================================================================
-- STEP 6: Update notification triggers - Comments
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  resource_owner_id UUID;
  parent_comment_author_id UUID;
  notification_id UUID;
BEGIN
  -- Get resource owner
  SELECT owner_id INTO resource_owner_id
  FROM resources
  WHERE id = NEW.resource_id;

  -- If this is a reply, get parent comment author
  IF NEW.parent_id IS NOT NULL THEN
    SELECT author_id INTO parent_comment_author_id
    FROM comments
    WHERE id = NEW.parent_id;

    -- Notify parent comment author (if not self-reply)
    IF parent_comment_author_id IS NOT NULL AND parent_comment_author_id != NEW.author_id THEN
      notification_id := create_notification_base(
        p_user_id := parent_comment_author_id,
        p_type := 'comment.replied',
        p_actor_id := NEW.author_id,
        p_resource_id := NEW.resource_id,
        p_comment_id := NEW.id,
        p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.resource_id LIMIT 1)
      );

      -- Send push notification
      PERFORM send_push_notification_async(
        parent_comment_author_id,
        notification_id,
        'comment.replied',
        'New reply to your comment',
        'Someone replied to your comment'
      );
    END IF;
  END IF;

  -- Notify resource owner (if not commenter and not already notified as parent author)
  IF resource_owner_id IS NOT NULL
     AND resource_owner_id != NEW.author_id
     AND resource_owner_id != parent_comment_author_id THEN
    notification_id := create_notification_base(
      p_user_id := resource_owner_id,
      p_type := 'resource.commented',
      p_actor_id := NEW.author_id,
      p_resource_id := NEW.resource_id,
      p_comment_id := NEW.id,
      p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.resource_id LIMIT 1)
    );

    -- Send push notification
    PERFORM send_push_notification_async(
      resource_owner_id,
      notification_id,
      'resource.commented',
      'New comment on your resource',
      'Someone commented on your resource'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 7: Update notification triggers - Claims
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_on_claim()
RETURNS TRIGGER AS $$
DECLARE
  resource_owner_id UUID;
  notification_id UUID;
BEGIN
  -- Get resource owner
  SELECT owner_id INTO resource_owner_id
  FROM resources
  WHERE id = NEW.resource_id;

  -- Notify resource owner
  IF resource_owner_id IS NOT NULL AND resource_owner_id != NEW.claimant_id THEN
    notification_id := create_notification_base(
      p_user_id := resource_owner_id,
      p_type := 'claim.created',
      p_actor_id := NEW.claimant_id,
      p_resource_id := NEW.resource_id,
      p_claim_id := NEW.id,
      p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.resource_id LIMIT 1)
    );

    -- Send push notification
    PERFORM send_push_notification_async(
      resource_owner_id,
      notification_id,
      'claim.created',
      'New claim on your resource',
      'Someone claimed your resource'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION notify_on_claim_status_change()
RETURNS TRIGGER AS $$
DECLARE
  resource_owner_id UUID;
  resource_type_val resource_type;
  notification_id UUID;
  notification_metadata JSONB;
BEGIN
  -- Skip if status didn't change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get resource owner and type
  SELECT owner_id, type INTO resource_owner_id, resource_type_val
  FROM resources
  WHERE id = NEW.resource_id;

  -- Handle approved/rejected � claim.responded
  IF NEW.status IN ('approved', 'rejected') THEN
    notification_metadata := jsonb_build_object('response', NEW.status::text);

    notification_id := create_notification_base(
      p_user_id := NEW.claimant_id,
      p_type := 'claim.responded',
      p_actor_id := resource_owner_id,
      p_resource_id := NEW.resource_id,
      p_claim_id := NEW.id,
      p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.resource_id LIMIT 1),
      p_metadata := notification_metadata
    );

    PERFORM send_push_notification_async(
      NEW.claimant_id,
      notification_id,
      'claim.responded',
      'Response to your claim',
      CASE NEW.status
        WHEN 'approved' THEN 'Your claim was approved'
        ELSE 'Your claim was rejected'
      END
    );
  END IF;

  -- Handle cancelled � claim.cancelled
  IF NEW.status = 'cancelled' THEN
    notification_id := create_notification_base(
      p_user_id := resource_owner_id,
      p_type := 'claim.cancelled',
      p_actor_id := NEW.claimant_id,
      p_resource_id := NEW.resource_id,
      p_claim_id := NEW.id,
      p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.resource_id LIMIT 1)
    );

    PERFORM send_push_notification_async(
      resource_owner_id,
      notification_id,
      'claim.cancelled',
      'Claim cancelled',
      'A claim on your resource was cancelled'
    );
  END IF;

  -- Handle going � resource.given (to receiver)
  IF OLD.status = 'going' AND NEW.status = 'given' THEN
    notification_id := create_notification_base(
      p_user_id := NEW.claimant_id,
      p_type := 'resource.given',
      p_actor_id := resource_owner_id,
      p_resource_id := NEW.resource_id,
      p_claim_id := NEW.id,
      p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.resource_id LIMIT 1)
    );

    PERFORM send_push_notification_async(
      NEW.claimant_id,
      notification_id,
      'resource.given',
      'Resource marked as given',
      'Confirm you received the resource'
    );
  END IF;

  -- Handle given � received � resource.received (to giver)
  IF OLD.status = 'given' AND NEW.status = 'received' THEN
    notification_id := create_notification_base(
      p_user_id := resource_owner_id,
      p_type := 'resource.received',
      p_actor_id := NEW.claimant_id,
      p_resource_id := NEW.resource_id,
      p_claim_id := NEW.id,
      p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.resource_id LIMIT 1)
    );

    PERFORM send_push_notification_async(
      resource_owner_id,
      notification_id,
      'resource.received',
      'Resource confirmed received',
      'The receiver confirmed they got the resource'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 8: Update notification triggers - Resources
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_new_resource(
  p_user_id UUID,
  p_actor_id UUID,
  p_resource_id UUID,
  p_community_id UUID,
  p_resource_type resource_type,
  p_resource_title TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_type_val notification_type;
  notification_id UUID;
BEGIN
  -- Determine notification type based on resource type
  IF p_resource_type = 'event' THEN
    notification_type_val := 'event.created';
  ELSE
    notification_type_val := 'resource.created';
  END IF;

  notification_id := create_notification_base(
    p_user_id := p_user_id,
    p_type := notification_type_val,
    p_actor_id := p_actor_id,
    p_resource_id := p_resource_id,
    p_community_id := p_community_id,
    p_metadata := jsonb_build_object('resource_title', p_resource_title)
  );

  -- Send push notification
  PERFORM send_push_notification_async(
    p_user_id,
    notification_id,
    notification_type_val,
    CASE WHEN p_resource_type = 'event' THEN 'New event' ELSE 'New resource' END,
    p_resource_title
  );

  RETURN notification_id;
END;
$$;

CREATE OR REPLACE FUNCTION notify_on_resource_community_insert()
RETURNS TRIGGER AS $$
DECLARE
  resource_record RECORD;
  member_record RECORD;
BEGIN
  -- Get resource details
  SELECT * INTO resource_record
  FROM resources
  WHERE id = NEW.resource_id;

  -- Skip if resource doesn't exist or is not scheduled
  IF resource_record IS NULL OR resource_record.status != 'scheduled' THEN
    RETURN NEW;
  END IF;

  -- Notify all community members about new resource
  FOR member_record IN
    SELECT user_id
    FROM community_memberships
    WHERE community_id = NEW.community_id
      AND user_id != resource_record.owner_id
  LOOP
    PERFORM notify_new_resource(
      member_record.user_id,
      resource_record.owner_id,
      NEW.resource_id,
      NEW.community_id,
      resource_record.type,
      resource_record.title
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION notify_on_resource_update()
RETURNS TRIGGER AS $$
DECLARE
  notification_type_val notification_type;
  claim_record RECORD;
  changes TEXT[];
  notification_id UUID;
BEGIN
  -- Determine what changed
  changes := ARRAY[]::TEXT[];

  IF OLD.title != NEW.title THEN
    changes := array_append(changes, 'title');
  END IF;

  IF OLD.description != NEW.description THEN
    changes := array_append(changes, 'description');
  END IF;

  IF OLD.status != NEW.status THEN
    changes := array_append(changes, 'status');
  END IF;

  -- Skip if nothing significant changed
  IF array_length(changes, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine notification type
  IF NEW.type = 'event' THEN
    notification_type_val := 'event.updated';
  ELSE
    notification_type_val := 'resource.updated';
  END IF;

  -- Notify all active claimants
  FOR claim_record IN
    SELECT claimant_id
    FROM resource_claims
    WHERE resource_id = NEW.id
      AND status IN ('pending', 'approved', 'going', 'given')
      AND claimant_id != NEW.owner_id
  LOOP
    notification_id := create_notification_base(
      p_user_id := claim_record.claimant_id,
      p_type := notification_type_val,
      p_actor_id := NEW.owner_id,
      p_resource_id := NEW.id,
      p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.id LIMIT 1),
      p_metadata := jsonb_build_object('changes', changes)
    );

    PERFORM send_push_notification_async(
      claim_record.claimant_id,
      notification_id,
      notification_type_val,
      CASE WHEN NEW.type = 'event' THEN 'Event updated' ELSE 'Resource updated' END,
      NEW.title
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION notify_on_resource_cancellation()
RETURNS TRIGGER AS $$
DECLARE
  claim_record RECORD;
  notification_id UUID;
BEGIN
  -- Only for events
  IF NEW.type != 'event' THEN
    RETURN NEW;
  END IF;

  -- Only when status changes to cancelled
  IF OLD.status = NEW.status OR NEW.status != 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Notify all active claimants
  FOR claim_record IN
    SELECT claimant_id
    FROM resource_claims
    WHERE resource_id = NEW.id
      AND status IN ('pending', 'approved', 'going')
      AND claimant_id != NEW.owner_id
  LOOP
    notification_id := create_notification_base(
      p_user_id := claim_record.claimant_id,
      p_type := 'event.cancelled',
      p_actor_id := NEW.owner_id,
      p_resource_id := NEW.id,
      p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.id LIMIT 1)
    );

    PERFORM send_push_notification_async(
      claim_record.claimant_id,
      notification_id,
      'event.cancelled',
      'Event cancelled',
      NEW.title || ' has been cancelled'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 9: Update notification triggers - Membership
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_on_membership_change()
RETURNS TRIGGER AS $$
DECLARE
  admin_record RECORD;
  notification_id UUID;
  action_text TEXT;
BEGIN
  -- Determine if this is a join or leave
  IF TG_OP = 'INSERT' THEN
    action_text := 'joined';
  ELSIF TG_OP = 'DELETE' THEN
    action_text := 'left';
  ELSE
    RETURN NEW;
  END IF;

  -- Notify community admins
  FOR admin_record IN
    SELECT user_id
    FROM community_memberships
    WHERE community_id = COALESCE(NEW.community_id, OLD.community_id)
      AND role IN ('admin', 'owner')
      AND user_id != COALESCE(NEW.user_id, OLD.user_id)
  LOOP
    notification_id := create_notification_base(
      p_user_id := admin_record.user_id,
      p_type := 'membership.updated',
      p_actor_id := COALESCE(NEW.user_id, OLD.user_id),
      p_community_id := COALESCE(NEW.community_id, OLD.community_id),
      p_metadata := jsonb_build_object('action', action_text)
    );

    PERFORM send_push_notification_async(
      admin_record.user_id,
      notification_id,
      'membership.updated',
      'Membership change',
      'A member ' || action_text || ' the community'
    );
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old triggers if they exist
DROP TRIGGER IF EXISTS notify_on_membership_join ON community_memberships;
DROP TRIGGER IF EXISTS notify_on_membership_leave ON community_memberships;

-- Create new unified trigger
CREATE TRIGGER notify_on_membership_change_insert
  AFTER INSERT ON community_memberships
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_membership_change();

CREATE TRIGGER notify_on_membership_change_delete
  AFTER DELETE ON community_memberships
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_membership_change();

-- ============================================================================
-- STEP 10: Update notification triggers - Social
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_on_new_conversation()
RETURNS TRIGGER AS $$
DECLARE
  participant_id UUID;
  notification_id UUID;
BEGIN
  -- Notify all participants except the creator
  FOR participant_id IN
    SELECT user_id
    FROM conversation_participants
    WHERE conversation_id = NEW.id
      AND user_id != NEW.created_by
  LOOP
    notification_id := create_notification_base(
      p_user_id := participant_id,
      p_type := 'conversation.requested',
      p_actor_id := NEW.created_by,
      p_conversation_id := NEW.id
    );

    PERFORM send_push_notification_async(
      participant_id,
      notification_id,
      'conversation.requested',
      'New conversation',
      'Someone started a conversation with you'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  participant_id UUID;
  notification_id UUID;
BEGIN
  -- Notify all participants except the sender
  FOR participant_id IN
    SELECT user_id
    FROM conversation_participants
    WHERE conversation_id = NEW.conversation_id
      AND user_id != NEW.sender_id
  LOOP
    notification_id := create_notification_base(
      p_user_id := participant_id,
      p_type := 'message.received',
      p_actor_id := NEW.sender_id,
      p_conversation_id := NEW.conversation_id
    );

    PERFORM send_push_notification_async(
      participant_id,
      notification_id,
      'message.received',
      'New message',
      'You received a new message'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS notify_on_message_created ON messages;

-- Create new trigger
CREATE TRIGGER notify_on_message_received
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_message();

CREATE OR REPLACE FUNCTION notify_on_shoutout()
RETURNS TRIGGER AS $$
DECLARE
  notification_id UUID;
BEGIN
  -- Notify the recipient
  IF NEW.to_user_id IS NOT NULL AND NEW.to_user_id != NEW.from_user_id THEN
    notification_id := create_notification_base(
      p_user_id := NEW.to_user_id,
      p_type := 'shoutout.received',
      p_actor_id := NEW.from_user_id,
      p_shoutout_id := NEW.id,
      p_community_id := NEW.community_id
    );

    PERFORM send_push_notification_async(
      NEW.to_user_id,
      notification_id,
      'shoutout.received',
      'New shoutout',
      'Someone gave you a shoutout!'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 11: Delete obsolete triggers and functions
-- ============================================================================

-- Drop obsolete trust points notification function
DROP FUNCTION IF EXISTS notify_trust_points() CASCADE;

-- Drop obsolete connection notification functions
DROP FUNCTION IF EXISTS notify_on_connection_request() CASCADE;
DROP FUNCTION IF EXISTS notify_on_connection_accepted() CASCADE;

-- ============================================================================
-- STEP 12: Recreate notification_details view
-- ============================================================================

CREATE VIEW notification_details AS
SELECT
    n.id,
    n.user_id,
    n.type,
    n.resource_id,
    n.comment_id,
    n.claim_id,
    n.community_id,
    n.shoutout_id,
    n.conversation_id,
    n.actor_id,
    n.metadata,
    n.read_at,
    n.created_at,
    n.updated_at,
    up_actor.full_name AS actor_display_name,
    up_actor.avatar_url AS actor_avatar_url,
    -- Prefer title from metadata (denormalized), fall back to JOIN for backward compatibility
    COALESCE(n.metadata->>'resource_title', r.title) AS resource_title,
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

COMMENT ON VIEW notification_details IS 'Comprehensive view of notifications with denormalized data. Resource titles are preserved in metadata for historical notifications.';
