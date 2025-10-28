-- Replace push_enabled and email_enabled with single notifications_enabled toggle

-- Add new notifications_enabled column (default true)
ALTER TABLE notification_preferences
ADD COLUMN notifications_enabled BOOLEAN NOT NULL DEFAULT true;

-- Set notifications_enabled based on existing push_enabled or email_enabled
-- If either was true, keep notifications enabled
UPDATE notification_preferences
SET notifications_enabled = (push_enabled OR email_enabled);

-- Drop old columns
ALTER TABLE notification_preferences
DROP COLUMN push_enabled,
DROP COLUMN email_enabled;
