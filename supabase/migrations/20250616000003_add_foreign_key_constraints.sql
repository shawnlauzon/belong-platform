/*
  # Add foreign key constraint from conversations to direct_messages

  1. Foreign Key
    - Add foreign key constraint for `last_message_id` in conversations table
    - This couldn't be added in the initial conversations migration because 
      direct_messages table didn't exist yet

  2. Triggers
    - Add trigger to automatically update conversation.last_message_id when new messages are sent
    - Add trigger to update conversation.last_activity_at when new messages are sent
*/

-- Add foreign key constraint for last_message_id
ALTER TABLE conversations 
ADD CONSTRAINT conversations_last_message_id_fkey 
FOREIGN KEY (last_message_id) REFERENCES direct_messages(id) ON DELETE SET NULL;

-- Create trigger function to update conversation when a new message is sent
CREATE OR REPLACE FUNCTION update_conversation_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the conversation's last_message_id and last_activity_at
    UPDATE conversations 
    SET 
        last_message_id = NEW.id,
        last_activity_at = NEW.created_at,
        updated_at = now()
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update conversation when new message is inserted
CREATE TRIGGER update_conversation_on_new_message_trigger
    AFTER INSERT ON direct_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_on_new_message();