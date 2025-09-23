-- Create a view for conversations with their last message
-- This resolves PostgREST limitations with ordering by related table fields

-- First, ensure we have the optimal index for performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_updated
ON messages(conversation_id, updated_at DESC);

-- Create the view that efficiently gets the last message for each conversation
CREATE VIEW conversations_with_last_message AS
SELECT
  c.*,
  -- Get the last message using LATERAL JOIN
  lm.id AS last_message_id,
  lm.content AS last_message_content,
  lm.sender_id AS last_message_sender_id,
  lm.created_at AS last_message_created_at,
  lm.updated_at AS last_message_updated_at,
  lm.is_deleted AS last_message_is_deleted,
  lm.community_id AS last_message_community_id,
  lm.encryption_version AS last_message_encryption_version,
  lm.is_edited AS last_message_is_edited
FROM conversations c
LEFT JOIN LATERAL (
  SELECT
    id,
    content,
    sender_id,
    created_at,
    updated_at,
    is_deleted,
    community_id,
    encryption_version,
    is_edited
  FROM messages m
  WHERE m.conversation_id = c.id
    AND m.is_deleted = false
  ORDER BY m.updated_at DESC
  LIMIT 1
) lm ON true;

-- Grant appropriate permissions
GRANT SELECT ON conversations_with_last_message TO authenticated;
GRANT SELECT ON conversations_with_last_message TO service_role;