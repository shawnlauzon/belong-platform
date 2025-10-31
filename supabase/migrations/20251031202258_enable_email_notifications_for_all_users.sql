-- Enable email notifications for all users and all notification types
UPDATE notification_preferences
SET
  comment_replied = jsonb_set(comment_replied, '{email}', 'true'),
  resource_commented = jsonb_set(resource_commented, '{email}', 'true'),
  claim_created = jsonb_set(claim_created, '{email}', 'true'),
  claim_cancelled = jsonb_set(claim_cancelled, '{email}', 'true'),
  claim_responded = jsonb_set(claim_responded, '{email}', 'true'),
  resource_given = jsonb_set(resource_given, '{email}', 'true'),
  resource_received = jsonb_set(resource_received, '{email}', 'true'),
  resource_created = jsonb_set(resource_created, '{email}', 'true'),
  event_created = jsonb_set(event_created, '{email}', 'true'),
  resource_updated = jsonb_set(resource_updated, '{email}', 'true'),
  event_updated = jsonb_set(event_updated, '{email}', 'true'),
  event_cancelled = jsonb_set(event_cancelled, '{email}', 'true'),
  resource_expiring = jsonb_set(resource_expiring, '{email}', 'true'),
  event_starting = jsonb_set(event_starting, '{email}', 'true'),
  message_received = jsonb_set(message_received, '{email}', 'true'),
  conversation_requested = jsonb_set(conversation_requested, '{email}', 'true'),
  shoutout_received = jsonb_set(shoutout_received, '{email}', 'true'),
  membership_updated = jsonb_set(membership_updated, '{email}', 'true'),
  trustlevel_changed = jsonb_set(trustlevel_changed, '{email}', 'true'),
  connection_accepted = jsonb_set(connection_accepted, '{email}', 'true'),
  updated_at = now();

-- Update default value for message_received to have email enabled
ALTER TABLE notification_preferences
  ALTER COLUMN message_received SET DEFAULT '{"push": true, "email": true, "in_app": true}'::jsonb;
