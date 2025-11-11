-- ============================================================================
-- Replace notifications_enabled with push_enabled and email_enabled
-- ============================================================================
-- This migration splits the single notifications_enabled column into two
-- separate columns for push and email, allowing independent control.
-- Both default to true so new users have all notifications enabled.

-- ============================================================================
-- STEP 1: Add new columns with default true
-- ============================================================================

ALTER TABLE notification_preferences
ADD COLUMN push_enabled BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE notification_preferences
ADD COLUMN email_enabled BOOLEAN NOT NULL DEFAULT true;

-- ============================================================================
-- STEP 2: Migrate existing data
-- ============================================================================

-- Copy notifications_enabled value to both new columns for existing rows
UPDATE notification_preferences
SET
  push_enabled = notifications_enabled,
  email_enabled = notifications_enabled;

-- ============================================================================
-- STEP 3: Drop old column
-- ============================================================================

ALTER TABLE notification_preferences
DROP COLUMN notifications_enabled;

-- ============================================================================
-- STEP 4: Update deliver_notification function to use new columns
-- ============================================================================

CREATE OR REPLACE FUNCTION deliver_notification()
RETURNS TRIGGER AS $$
DECLARE
  notification_type_val TEXT;
  prefs JSONB;
  type_pref JSONB;
  email_enabled BOOLEAN;
  push_enabled BOOLEAN;
  push_enabled_global BOOLEAN;
  email_enabled_global BOOLEAN;
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
    -- Check global push and email enabled flags
    push_enabled_global := COALESCE((prefs->>'push_enabled')::boolean, TRUE);
    email_enabled_global := COALESCE((prefs->>'email_enabled')::boolean, TRUE);

    -- If both are disabled globally, short-circuit
    IF push_enabled_global = FALSE AND email_enabled_global = FALSE THEN
      RETURN NEW;
    END IF;

    -- Look up notification type from action
    SELECT notification_type INTO notification_type_val
    FROM action_to_notification_type_mapping
    WHERE action = NEW.action;

    -- Critical notifications always send if globally enabled
    IF NEW.action = 'event.cancelled' THEN
      email_enabled := email_enabled_global;
      push_enabled := push_enabled_global;
    ELSIF notification_type_val IS NULL THEN
      -- If no mapping found, default to enabled (with global check)
      email_enabled := email_enabled_global;
      push_enabled := push_enabled_global;
    ELSE
      -- Replace dots with underscores to match column names
      notification_type_val := replace(notification_type_val, '.', '_');

      -- Get type-specific preference
      type_pref := prefs -> notification_type_val;

      IF type_pref IS NULL THEN
        -- If preference not found, default to enabled (with global check)
        email_enabled := email_enabled_global;
        push_enabled := push_enabled_global;
      ELSE
        -- Check if email and push are enabled for this notification type AND globally
        email_enabled := email_enabled_global AND COALESCE((type_pref->>'email')::boolean, TRUE);
        push_enabled := push_enabled_global AND COALESCE((type_pref->>'push')::boolean, TRUE);
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

COMMENT ON FUNCTION deliver_notification IS 'Delivers notifications via push and email based on user preferences. Checks both global switches (push_enabled, email_enabled) and per-type preferences.';
