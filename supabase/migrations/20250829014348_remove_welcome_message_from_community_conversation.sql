-- Remove the welcome message from community conversation creation

-- Drop the current function
DROP FUNCTION IF EXISTS create_community_conversation(UUID);

-- Create the updated function without the welcome message
CREATE OR REPLACE FUNCTION create_community_conversation(p_community_id UUID)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
  v_community_name TEXT;
BEGIN
  -- Check if conversation already exists
  SELECT id INTO v_conversation_id 
  FROM conversations 
  WHERE community_id = p_community_id AND conversation_type = 'community';
  
  -- If conversation exists, return its ID
  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  -- Get community name for conversation metadata
  SELECT name INTO v_community_name FROM communities WHERE id = p_community_id;
  
  IF v_community_name IS NULL THEN
    RAISE EXCEPTION 'Community not found with id: %', p_community_id;
  END IF;

  -- Create the community conversation without a welcome message
  INSERT INTO conversations (community_id, conversation_type)
  VALUES (p_community_id, 'community')
  RETURNING id INTO v_conversation_id;

  -- Add all current community members as participants
  INSERT INTO conversation_participants (conversation_id, user_id, joined_at, last_read_at, unread_count)
  SELECT 
    v_conversation_id,
    cm.user_id,
    cm.created_at,  -- Use their community join date as chat join date
    cm.created_at,  -- Mark as read from their join time
    0               -- No unread messages initially
  FROM community_memberships cm
  WHERE cm.community_id = p_community_id;

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;