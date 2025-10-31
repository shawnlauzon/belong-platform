-- ============================================================================
-- Add Email Notification Support
-- ============================================================================
-- This migration adds email notification delivery via Postmark API

-- ============================================================================
-- STEP 1: Create helper function to check if email should be sent
-- ============================================================================

CREATE OR REPLACE FUNCTION should_send_email(
  p_user_id UUID,
  p_action action_type
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  prefs JSONB;
  type_pref JSONB;
  notification_type_val TEXT;
  notifications_enabled_val BOOLEAN;
BEGIN
  -- Get user preferences as JSONB
  SELECT to_jsonb(np.*) INTO prefs
  FROM notification_preferences np
  WHERE user_id = p_user_id;

  -- If no preferences, default to true
  IF prefs IS NULL THEN
    RETURN true;
  END IF;

  -- Check global notifications enabled flag
  notifications_enabled_val := (prefs->>'notifications_enabled')::boolean;
  IF notifications_enabled_val = false THEN
    RETURN false;
  END IF;

  -- Critical notifications always send if notifications globally enabled
  IF p_action = 'event.cancelled' THEN
    RETURN true;
  END IF;

  -- Look up notification type from action
  SELECT notification_type INTO notification_type_val
  FROM action_to_notification_type_mapping
  WHERE action = p_action;

  -- If no mapping found, default to true
  IF notification_type_val IS NULL THEN
    RETURN true;
  END IF;

  -- Replace dots with underscores to match column names
  notification_type_val := replace(notification_type_val, '.', '_');

  -- Get type-specific preference using JSONB accessor
  type_pref := prefs -> notification_type_val;

  -- If preference not found, default to true
  IF type_pref IS NULL THEN
    RETURN true;
  END IF;

  -- Check if email is enabled for this notification type
  RETURN (type_pref->>'email')::boolean = true;
END;
$$;

-- ============================================================================
-- STEP 2: Create function to send email notification asynchronously
-- ============================================================================

CREATE OR REPLACE FUNCTION send_email_notification_async(
  p_user_id UUID,
  p_notification_id UUID,
  p_action action_type,
  p_title TEXT,
  p_body TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if should send email
  IF NOT should_send_email(p_user_id, p_action) THEN
    RETURN;
  END IF;

  -- Call Edge Function via pg_net (non-blocking)
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/send-email-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
    ),
    body := jsonb_build_object(
      'user_id', p_user_id,
      'notification_id', p_notification_id,
      'type', p_action,
      'title', p_title,
      'body', p_body,
      'metadata', p_metadata
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Failed to send email notification: %', SQLERRM;
END;
$$;

-- ============================================================================
-- STEP 3: Update default values for email preferences (opt-out)
-- ============================================================================

-- Update column defaults to enable email by default
ALTER TABLE notification_preferences 
  ALTER COLUMN resource_commented SET DEFAULT '{"in_app": true, "push": true, "email": true}'::jsonb,
  ALTER COLUMN comment_replied SET DEFAULT '{"in_app": true, "push": true, "email": true}'::jsonb,
  ALTER COLUMN claim_created SET DEFAULT '{"in_app": true, "push": true, "email": true}'::jsonb,
  ALTER COLUMN claim_cancelled SET DEFAULT '{"in_app": true, "push": true, "email": true}'::jsonb,
  ALTER COLUMN claim_responded SET DEFAULT '{"in_app": true, "push": true, "email": true}'::jsonb,
  ALTER COLUMN resource_given SET DEFAULT '{"in_app": true, "push": true, "email": true}'::jsonb,
  ALTER COLUMN resource_received SET DEFAULT '{"in_app": true, "push": true, "email": true}'::jsonb,
  ALTER COLUMN resource_created SET DEFAULT '{"in_app": true, "push": true, "email": true}'::jsonb,
  ALTER COLUMN event_created SET DEFAULT '{"in_app": true, "push": true, "email": true}'::jsonb,
  ALTER COLUMN resource_updated SET DEFAULT '{"in_app": true, "push": true, "email": true}'::jsonb,
  ALTER COLUMN event_updated SET DEFAULT '{"in_app": true, "push": true, "email": true}'::jsonb,
  ALTER COLUMN event_cancelled SET DEFAULT '{"in_app": true, "push": true, "email": true}'::jsonb,
  ALTER COLUMN resource_expiring SET DEFAULT '{"in_app": true, "push": true, "email": true}'::jsonb,
  ALTER COLUMN event_starting SET DEFAULT '{"in_app": true, "push": true, "email": true}'::jsonb,
  ALTER COLUMN message_received SET DEFAULT '{"in_app": true, "push": true, "email": false}'::jsonb,
  ALTER COLUMN conversation_requested SET DEFAULT '{"in_app": true, "push": true, "email": true}'::jsonb,
  ALTER COLUMN shoutout_received SET DEFAULT '{"in_app": true, "push": true, "email": true}'::jsonb,
  ALTER COLUMN membership_updated SET DEFAULT '{"in_app": true, "push": true, "email": true}'::jsonb,
  ALTER COLUMN trustlevel_changed SET DEFAULT '{"in_app": true, "push": true, "email": true}'::jsonb,
  ALTER COLUMN connection_accepted SET DEFAULT '{"in_app": true, "push": true, "email": true}'::jsonb;

-- Update existing rows to enable email for all notification types
UPDATE notification_preferences
SET
  resource_commented = jsonb_set(resource_commented, '{email}', 'true'::jsonb),
  comment_replied = jsonb_set(comment_replied, '{email}', 'true'::jsonb),
  claim_created = jsonb_set(claim_created, '{email}', 'true'::jsonb),
  claim_cancelled = jsonb_set(claim_cancelled, '{email}', 'true'::jsonb),
  claim_responded = jsonb_set(claim_responded, '{email}', 'true'::jsonb),
  resource_given = jsonb_set(resource_given, '{email}', 'true'::jsonb),
  resource_received = jsonb_set(resource_received, '{email}', 'true'::jsonb),
  resource_created = jsonb_set(resource_created, '{email}', 'true'::jsonb),
  event_created = jsonb_set(event_created, '{email}', 'true'::jsonb),
  resource_updated = jsonb_set(resource_updated, '{email}', 'true'::jsonb),
  event_updated = jsonb_set(event_updated, '{email}', 'true'::jsonb),
  event_cancelled = jsonb_set(event_cancelled, '{email}', 'true'::jsonb),
  resource_expiring = jsonb_set(resource_expiring, '{email}', 'true'::jsonb),
  event_starting = jsonb_set(event_starting, '{email}', 'true'::jsonb),
  message_received = jsonb_set(message_received, '{email}', 'false'::jsonb),
  conversation_requested = jsonb_set(conversation_requested, '{email}', 'true'::jsonb),
  shoutout_received = jsonb_set(shoutout_received, '{email}', 'true'::jsonb),
  membership_updated = jsonb_set(membership_updated, '{email}', 'true'::jsonb),
  trustlevel_changed = jsonb_set(trustlevel_changed, '{email}', 'true'::jsonb),
  connection_accepted = jsonb_set(connection_accepted, '{email}', 'true'::jsonb)
WHERE notifications_enabled = true;

-- ============================================================================
-- STEP 4: Update notification triggers to include email calls
-- ============================================================================
-- All triggers that create notifications now also send emails

-- Update comment notifications
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

    -- Notify parent comment author (if not self-reply and in_app enabled)
    IF parent_comment_author_id IS NOT NULL
       AND parent_comment_author_id != NEW.author_id
       AND should_create_in_app_notification(parent_comment_author_id, 'comment.replied') THEN
      notification_id := create_notification_base(
        p_user_id := parent_comment_author_id,
        p_action := 'comment.replied',
        p_actor_id := NEW.author_id,
        p_resource_id := NEW.resource_id,
        p_comment_id := NEW.id,
        p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.resource_id LIMIT 1),
        p_metadata := jsonb_build_object(
          'content_preview', LEFT(NEW.content, 200)
        )
      );

      -- Send push notification
      PERFORM send_push_notification_async(
        parent_comment_author_id,
        notification_id,
        'comment.replied',
        'New reply to your comment',
        'Someone replied to your comment'
      );

      -- Send email notification
      PERFORM send_email_notification_async(
        parent_comment_author_id,
        notification_id,
        'comment.replied',
        'New reply to your comment',
        'Someone replied to your comment'
      );
    END IF;
  END IF;

  -- Notify resource owner (if not commenter, not already notified, and in_app enabled)
  IF resource_owner_id IS NOT NULL
     AND resource_owner_id != NEW.author_id
     AND (parent_comment_author_id IS NULL OR resource_owner_id != parent_comment_author_id)
     AND should_create_in_app_notification(resource_owner_id, 'resource.commented') THEN
    notification_id := create_notification_base(
      p_user_id := resource_owner_id,
      p_action := 'resource.commented',
      p_actor_id := NEW.author_id,
      p_resource_id := NEW.resource_id,
      p_comment_id := NEW.id,
      p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.resource_id LIMIT 1),
      p_metadata := jsonb_build_object(
        'content_preview', LEFT(NEW.content, 200)
      )
    );

    -- Send push notification
    PERFORM send_push_notification_async(
      resource_owner_id,
      notification_id,
      'resource.commented',
      'New comment on your resource',
      'Someone commented on your resource'
    );

    -- Send email notification
    PERFORM send_email_notification_async(
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

-- Update claim status change notifications
CREATE OR REPLACE FUNCTION notify_on_claim_status_change()
RETURNS TRIGGER AS $$
DECLARE
  resource_owner_id UUID;
  resource_type_val resource_type;
  notification_id UUID;
  notification_metadata JSONB;
  action_to_notify action_type;
BEGIN
  -- Skip if status didn't change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get resource owner and type
  SELECT owner_id, type INTO resource_owner_id, resource_type_val
  FROM resources
  WHERE id = NEW.resource_id;

  -- Handle approved/rejected
  IF NEW.status IN ('approved', 'rejected') THEN
    notification_metadata := jsonb_build_object('response', NEW.status::text);
    action_to_notify := CASE NEW.status
      WHEN 'approved' THEN 'claim.approved'::action_type
      ELSE 'claim.rejected'::action_type
    END;

    IF should_create_in_app_notification(NEW.claimant_id, action_to_notify) THEN
      notification_id := create_notification_base(
        p_user_id := NEW.claimant_id,
        p_action := action_to_notify,
        p_actor_id := resource_owner_id,
        p_resource_id := NEW.resource_id,
        p_claim_id := NEW.id,
        p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.resource_id LIMIT 1),
        p_metadata := notification_metadata
      );

      PERFORM send_push_notification_async(
        NEW.claimant_id,
        notification_id,
        action_to_notify,
        'Response to your claim',
        CASE NEW.status
          WHEN 'approved' THEN 'Your claim was approved'
          ELSE 'Your claim was rejected'
        END
      );

      PERFORM send_email_notification_async(
        NEW.claimant_id,
        notification_id,
        action_to_notify,
        'Response to your claim',
        CASE NEW.status
          WHEN 'approved' THEN 'Your claim was approved'
          ELSE 'Your claim was rejected'
        END
      );
    END IF;
  END IF;

  -- Handle cancelled
  IF NEW.status = 'cancelled' AND should_create_in_app_notification(resource_owner_id, 'claim.cancelled') THEN
    notification_id := create_notification_base(
      p_user_id := resource_owner_id,
      p_action := 'claim.cancelled',
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

    PERFORM send_email_notification_async(
      resource_owner_id,
      notification_id,
      'claim.cancelled',
      'Claim cancelled',
      'A claim on your resource was cancelled'
    );
  END IF;

  -- Handle going → given
  IF OLD.status = 'going' AND NEW.status = 'given' AND should_create_in_app_notification(NEW.claimant_id, 'resource.given') THEN
    notification_id := create_notification_base(
      p_user_id := NEW.claimant_id,
      p_action := 'resource.given',
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

    PERFORM send_email_notification_async(
      NEW.claimant_id,
      notification_id,
      'resource.given',
      'Resource marked as given',
      'Confirm you received the resource'
    );
  END IF;

  -- Handle given → received
  IF OLD.status = 'given' AND NEW.status = 'received' AND should_create_in_app_notification(resource_owner_id, 'resource.received') THEN
    notification_id := create_notification_base(
      p_user_id := resource_owner_id,
      p_action := 'resource.received',
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

    PERFORM send_email_notification_async(
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

-- Update claim INSERT trigger
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

  -- Skip if owner is claiming their own resource
  IF resource_owner_id = NEW.claimant_id THEN
    RETURN NEW;
  END IF;

  -- Skip vote claims
  IF NEW.status = 'vote' THEN
    RETURN NEW;
  END IF;

  -- Notify resource owner
  IF resource_owner_id IS NOT NULL AND should_create_in_app_notification(resource_owner_id, 'claim.created') THEN
    notification_id := create_notification_base(
      p_user_id := resource_owner_id,
      p_action := 'claim.created',
      p_actor_id := NEW.claimant_id,
      p_resource_id := NEW.resource_id,
      p_claim_id := NEW.id,
      p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.resource_id LIMIT 1)
    );

    PERFORM send_push_notification_async(
      resource_owner_id,
      notification_id,
      'claim.created',
      'New claim on your resource',
      'Someone claimed your resource'
    );

    PERFORM send_email_notification_async(
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

-- Update message notifications  
CREATE OR REPLACE FUNCTION notify_on_message_received()
RETURNS TRIGGER AS $$
DECLARE
  participant_id UUID;
  notification_id UUID;
BEGIN
  -- Notify all other participants in the conversation
  FOR participant_id IN
    SELECT user_id
    FROM conversation_participants
    WHERE conversation_id = NEW.conversation_id
      AND user_id != NEW.sender_id
  LOOP
    IF should_create_in_app_notification(participant_id, 'message.received') THEN
      notification_id := create_notification_base(
        p_user_id := participant_id,
        p_action := 'message.received',
        p_actor_id := NEW.sender_id,
        p_conversation_id := NEW.conversation_id,
        p_metadata := jsonb_build_object(
          'message_preview', LEFT(NEW.content, 200)
        )
      );

      PERFORM send_push_notification_async(
        participant_id,
        notification_id,
        'message.received',
        'New message',
        LEFT(NEW.content, 100)
      );

      PERFORM send_email_notification_async(
        participant_id,
        notification_id,
        'message.received',
        'New message',
        LEFT(NEW.content, 100)
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update shoutout notifications
CREATE OR REPLACE FUNCTION notify_on_shoutout()
RETURNS TRIGGER AS $$
DECLARE
  notification_id UUID;
BEGIN
  IF should_create_in_app_notification(NEW.receiver_id, 'shoutout.received') THEN
    notification_id := create_notification_base(
      p_user_id := NEW.receiver_id,
      p_action := 'shoutout.received',
      p_actor_id := NEW.sender_id,
      p_shoutout_id := NEW.id,
      p_community_id := NEW.community_id
    );

    PERFORM send_push_notification_async(
      NEW.receiver_id,
      notification_id,
      'shoutout.received',
      'You received a shoutout!',
      'Someone gave you a shoutout'
    );

    PERFORM send_email_notification_async(
      NEW.receiver_id,
      notification_id,
      'shoutout.received',
      'You received a shoutout!',
      'Someone gave you a shoutout'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Migration complete
-- ============================================================================
-- Note: Additional triggers (membership, conversations, resource updates) 
-- can be updated following the same pattern if needed.
