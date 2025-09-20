-- Remove the trigger that updates conversation last message data
DROP TRIGGER IF EXISTS on_new_message ON messages;

-- Remove the trigger function
DROP FUNCTION IF EXISTS update_conversation_on_message();

-- Remove old conversation broadcast functions that reference removed fields
DROP FUNCTION IF EXISTS broadcast_conversation_update();

-- Remove the columns from conversations table
ALTER TABLE conversations
DROP COLUMN IF EXISTS last_message_at,
DROP COLUMN IF EXISTS last_message_preview,
DROP COLUMN IF EXISTS last_message_sender_id;

-- Remove the index on the removed column
DROP INDEX IF EXISTS idx_conversations_last_message;

-- Recreate the conversation broadcast function without the removed fields
CREATE OR REPLACE FUNCTION broadcast_conversation_update()
RETURNS TRIGGER AS $$
DECLARE
  conversation_record conversations%ROWTYPE;
BEGIN
  -- Get the full conversation record
  SELECT * INTO conversation_record
  FROM conversations
  WHERE id = NEW.id;

  -- Broadcast the conversation update to all participants
  PERFORM pg_notify(
    'conversation_update',
    json_build_object(
      'type', 'conversation_updated',
      'conversation', json_build_object(
        'id', conversation_record.id,
        'created_at', conversation_record.created_at,
        'updated_at', conversation_record.updated_at,
        'community_id', conversation_record.community_id,
        'conversation_type', conversation_record.conversation_type
      )
    )::text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix the broadcast_new_conversation function to not reference removed fields
CREATE OR REPLACE FUNCTION broadcast_new_conversation()
RETURNS TRIGGER AS $$
DECLARE
  participant_record RECORD;
  conversation_data JSONB;
  creator_id UUID;
  participants_array JSONB;
  conversation_record RECORD;
  participant_count INTEGER;
BEGIN
  -- Get the conversation details
  SELECT * INTO conversation_record
  FROM conversations
  WHERE id = NEW.conversation_id;

  -- Only process direct conversations
  IF conversation_record.conversation_type != 'direct' THEN
    RETURN NEW;
  END IF;

  -- Check if this is the second participant (when conversation is complete)
  SELECT COUNT(*) INTO participant_count
  FROM conversation_participants
  WHERE conversation_id = NEW.conversation_id;

  -- Only broadcast when we have exactly 2 participants (conversation is complete)
  IF participant_count != 2 THEN
    RETURN NEW;
  END IF;

  -- Get the creator (current authenticated user)
  creator_id := auth.uid();

  -- Only broadcast when the OTHER user is being added
  -- Skip if we're inserting ourselves (prevents duplicate)
  IF NEW.user_id = creator_id THEN
    RETURN NEW;
  END IF;

  -- Fetch participant user_ids
  SELECT json_agg(json_build_object('user_id', cp.user_id))::jsonb
  INTO participants_array
  FROM conversation_participants cp
  WHERE cp.conversation_id = NEW.conversation_id;

  -- Build the conversation data with participants (without removed fields)
  conversation_data := jsonb_build_object(
    'id', conversation_record.id,
    'created_at', conversation_record.created_at,
    'updated_at', conversation_record.updated_at,
    'community_id', conversation_record.community_id,
    'conversation_type', conversation_record.conversation_type,
    'conversation_participants', participants_array
  );

  -- Send broadcast to each participant EXCEPT the creator
  FOR participant_record IN
    SELECT user_id
    FROM conversation_participants
    WHERE conversation_id = NEW.conversation_id
      AND (creator_id IS NULL OR user_id != creator_id)
  LOOP
    PERFORM realtime.send(
      payload := conversation_data,
      event := 'new_conversation',
      topic := 'user:' || participant_record.user_id::text || ':notifications',
      private := true
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;