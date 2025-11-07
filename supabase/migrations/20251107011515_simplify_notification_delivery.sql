-- ============================================================================
-- Simplify Notification Delivery Architecture
-- ============================================================================
-- This migration centralizes all delivery logic in the deliver_notification trigger.
-- Preference checking happens once in the trigger, then edge functions are called directly.
-- This eliminates duplicate preference checks and intermediate wrapper functions.

-- ============================================================================
-- STEP 1: Update deliver_notification trigger to handle all delivery logic
-- ============================================================================

CREATE OR REPLACE FUNCTION deliver_notification()
RETURNS TRIGGER AS $$
DECLARE
  notification_type_val TEXT;
  prefs JSONB;
  type_pref JSONB;
  email_enabled BOOLEAN;
  push_enabled BOOLEAN;
  notifications_enabled BOOLEAN;
BEGIN
  -- Get user preferences
  SELECT to_jsonb(np.*) INTO prefs
  FROM notification_preferences np
  WHERE user_id = NEW.user_id;

  -- If no preferences, default to enabled
  IF prefs IS NULL THEN
    email_enabled := TRUE;
    push_enabled := TRUE;
  ELSE
    -- Check global notifications enabled flag
    notifications_enabled := (prefs->>'notifications_enabled')::boolean;

    IF notifications_enabled = FALSE THEN
      RETURN NEW;
    END IF;

    -- Look up notification type from action
    SELECT notification_type INTO notification_type_val
    FROM action_to_notification_type_mapping
    WHERE action = NEW.action;

    -- Critical notifications always send if globally enabled
    IF NEW.action = 'event.cancelled' THEN
      email_enabled := TRUE;
      push_enabled := TRUE;
    ELSIF notification_type_val IS NULL THEN
      -- If no mapping found, default to enabled
      email_enabled := TRUE;
      push_enabled := TRUE;
    ELSE
      -- Replace dots with underscores to match column names
      notification_type_val := replace(notification_type_val, '.', '_');

      -- Get type-specific preference
      type_pref := prefs -> notification_type_val;

      IF type_pref IS NULL THEN
        -- If preference not found, default to enabled
        email_enabled := TRUE;
        push_enabled := TRUE;
      ELSE
        -- Check if email and push are enabled for this notification type
        email_enabled := COALESCE((type_pref->>'email')::boolean, TRUE);
        push_enabled := COALESCE((type_pref->>'push')::boolean, TRUE);
      END IF;
    END IF;
  END IF;

  -- Send email notification if enabled
  IF email_enabled THEN
    BEGIN
      PERFORM net.http_post(
        url := get_project_url() || '/functions/v1/send-email-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || get_anon_key()
        ),
        body := jsonb_build_object(
          'user_id', NEW.user_id,
          'notification_id', NEW.id
        )
      );
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but don't fail the transaction
        RAISE WARNING 'Failed to send email notification: %', SQLERRM;
    END;
  END IF;

  -- Send push notification if enabled
  IF push_enabled THEN
    BEGIN
      PERFORM net.http_post(
        url := get_project_url() || '/functions/v1/send-push-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || get_anon_key()
        ),
        body := jsonb_build_object(
          'user_id', NEW.user_id,
          'notification_id', NEW.id
        )
      );
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but don't fail the transaction
        RAISE WARNING 'Failed to send push notification: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 2: Drop obsolete helper functions
-- ============================================================================

DROP FUNCTION IF EXISTS should_send_email(UUID, action_type);
DROP FUNCTION IF EXISTS should_send_push(UUID, action_type);
DROP FUNCTION IF EXISTS send_email_notification_async(UUID, UUID, action_type, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS send_push_notification_async(UUID, UUID, action_type, TEXT, TEXT, JSONB);

-- ============================================================================
-- STEP 3: Replace metadata JSONB with changes array and typed view columns
-- ============================================================================

-- Drop view first (it depends on metadata column)
DROP VIEW IF EXISTS notification_details;

-- Remove metadata column and add changes array to notifications table
ALTER TABLE notifications DROP COLUMN IF EXISTS metadata;
ALTER TABLE notifications ADD COLUMN changes text[];

COMMENT ON COLUMN notifications.changes IS 'Array of field names that changed (for resource.updated/event.updated notifications)';

-- ============================================================================
-- STEP 4: Recreate notification_details view with typed columns
-- ============================================================================

CREATE VIEW notification_details AS
SELECT
    n.id,
    n.user_id,
    n.action,
    n.resource_id,
    n.comment_id,
    n.claim_id,
    n.community_id,
    n.shoutout_id,
    n.conversation_id,
    n.actor_id,
    n.read_at,
    n.created_at,
    n.updated_at,
    n.changes,

    -- Actor data (display_name, full_name, avatar_url)
    CASE
        WHEN n.actor_id IS NOT NULL THEN jsonb_build_object(
            'display_name', COALESCE(up_actor.first_name, up_actor.full_name),
            'full_name', COALESCE(up_actor.full_name,
                CASE
                    WHEN up_actor.last_name IS NOT NULL THEN (up_actor.first_name || ' '::text) || up_actor.last_name
                    ELSE up_actor.first_name
                END),
            'avatar_url', up_actor.avatar_url
        )
        ELSE NULL
    END AS actor_data,

    -- Resource data (status, voting_deadline, timeslot times)
    CASE
        WHEN n.resource_id IS NOT NULL THEN jsonb_build_object(
            'title', r.title,
            'type', r.type,
            'status', r.status,
            'voting_deadline', r.voting_deadline,
            'image_url', r.image_urls[1],
            'timeslot_start_time', rt.start_time,
            'timeslot_end_time', rt.end_time
        )
        ELSE NULL
    END AS resource_data,

    -- Comment data (content preview)
    CASE
        WHEN n.comment_id IS NOT NULL THEN jsonb_build_object(
            'content_preview', LEFT(comm.content, 200)
        )
        ELSE NULL
    END AS comment_data,

    -- Claim data (status, commitment_level, timeslot, resource info, names)
    CASE
        WHEN n.claim_id IS NOT NULL THEN (
            SELECT jsonb_build_object(
                'status', rc.status,
                'commitment_level', rc.commitment_level,
                'timeslot_id', rc.timeslot_id,
                'timeslot_start_time', ts.start_time,
                'timeslot_end_time', ts.end_time,
                'resource_id', rc.resource_id,
                'resource_title', r_claim.title,
                'resource_type', r_claim.type,
                'claimant_id', rc.claimant_id,
                'claimant_name', pp.full_name,
                'owner_id', r_claim.owner_id,
                'owner_name', po.full_name
            )
            FROM resource_claims rc
            JOIN resources r_claim ON r_claim.id = rc.resource_id
            JOIN public_profiles pp ON pp.id = rc.claimant_id
            JOIN public_profiles po ON po.id = r_claim.owner_id
            LEFT JOIN resource_timeslots ts ON ts.id = rc.timeslot_id
            WHERE rc.id = n.claim_id
        )
        ELSE NULL
    END AS claim_data,

    -- Community name (kept as separate text column)
    c.name AS community_name,

    -- Shoutout message (kept as separate text column)
    s.message AS shoutout_message

FROM notifications n
LEFT JOIN public_profiles up_actor ON n.actor_id = up_actor.id
LEFT JOIN resources r ON n.resource_id = r.id
LEFT JOIN LATERAL (
    SELECT start_time, end_time
    FROM resource_timeslots
    WHERE resource_id = r.id
    ORDER BY start_time
    LIMIT 1
) rt ON true
LEFT JOIN communities c ON n.community_id = c.id
LEFT JOIN comments comm ON n.comment_id = comm.id
LEFT JOIN shoutouts s ON n.shoutout_id = s.id;

COMMENT ON VIEW notification_details IS 'Notification details with typed columns instead of generic metadata';

-- ============================================================================
-- STEP 5: Update create_notification_base to not build metadata
-- ============================================================================

DROP FUNCTION IF EXISTS create_notification_base(UUID, action_type, UUID, UUID, UUID, UUID, UUID, UUID, UUID, TEXT[]);
DROP FUNCTION IF EXISTS create_notification_base(UUID, action_type, UUID, UUID, UUID, UUID, UUID, UUID, UUID, JSONB);

CREATE OR REPLACE FUNCTION create_notification_base(
  p_user_id UUID,
  p_action action_type,
  p_actor_id UUID DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_comment_id UUID DEFAULT NULL,
  p_claim_id UUID DEFAULT NULL,
  p_shoutout_id UUID DEFAULT NULL,
  p_community_id UUID DEFAULT NULL,
  p_conversation_id UUID DEFAULT NULL,
  p_changes TEXT[] DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  -- Insert notification with only changes array (no metadata)
  INSERT INTO notifications (
    user_id,
    action,
    actor_id,
    resource_id,
    comment_id,
    claim_id,
    shoutout_id,
    community_id,
    conversation_id,
    changes
  ) VALUES (
    p_user_id,
    p_action,
    p_actor_id,
    p_resource_id,
    p_comment_id,
    p_claim_id,
    p_shoutout_id,
    p_community_id,
    p_conversation_id,
    p_changes
  )
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$;

COMMENT ON FUNCTION create_notification_base IS 'Creates notification with changes array only - all other data derived from JOINs in notification_details view';

-- ============================================================================
-- Migration complete
-- ============================================================================
