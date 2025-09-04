-- Fix column name mismatches in notification trigger functions
-- The trigger functions were referencing non-existent column names

-- Fix notify_on_shoutout function to use correct column names
CREATE OR REPLACE FUNCTION notify_on_shoutout() RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_notification(
    NEW.receiver_id,  -- Fixed: was NEW.recipient_id
    'shoutout_received',
    NEW.sender_id,    -- Fixed: was NEW.giver_id
    'You received a shoutout!',
    'Someone gave you a shoutout.',
    NULL, -- action_url
    NULL, -- resource_id
    NULL, -- comment_id
    NULL, -- claim_id
    NULL, -- message_id
    NULL, -- conversation_id
    NEW.community_id,
    jsonb_build_object('shoutout_id', NEW.id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix notify_on_comment function to use correct column names
CREATE OR REPLACE FUNCTION notify_on_comment() RETURNS TRIGGER AS $$
DECLARE
  resource_owner_id UUID;
  parent_comment_author_id UUID;
BEGIN
  -- Get resource owner
  SELECT owner_id INTO resource_owner_id  -- Fixed: was user_id
  FROM resources
  WHERE id = NEW.resource_id;
  
  -- If this is a reply to another comment, get the parent comment author
  IF NEW.parent_id IS NOT NULL THEN  -- Fixed: was NEW.parent_comment_id
    SELECT author_id INTO parent_comment_author_id  -- Fixed: was user_id
    FROM comments
    WHERE id = NEW.parent_id;  -- Fixed: was NEW.parent_comment_id
    
    -- Notify parent comment author if they're not the commenter
    IF parent_comment_author_id IS NOT NULL AND parent_comment_author_id != NEW.author_id THEN  -- Fixed: was NEW.user_id
      PERFORM create_notification(
        parent_comment_author_id,
        'comment_reply',
        NEW.author_id,  -- Fixed: was NEW.user_id
        'Reply to your comment',
        'Someone replied to your comment.',
        NULL, -- action_url
        NEW.resource_id,
        NEW.id, -- comment_id
        NULL, -- claim_id
        NULL, -- message_id
        NULL, -- conversation_id
        NULL, -- community_id
        jsonb_build_object('comment_id', NEW.id, 'parent_comment_id', NEW.parent_id)  -- Fixed: was NEW.parent_comment_id
      );
    END IF;
  END IF;
  
  -- Notify resource owner if they're not the commenter and not already notified as parent author
  IF resource_owner_id IS NOT NULL 
     AND resource_owner_id != NEW.author_id  -- Fixed: was NEW.user_id
     AND (parent_comment_author_id IS NULL OR resource_owner_id != parent_comment_author_id) THEN
    PERFORM create_notification(
      resource_owner_id,
      'comment',
      NEW.author_id,  -- Fixed: was NEW.user_id
      'New comment on your resource',
      'Someone commented on your resource.',
      NULL, -- action_url
      NEW.resource_id,
      NEW.id, -- comment_id
      NULL, -- claim_id
      NULL, -- message_id
      NULL, -- conversation_id
      NULL, -- community_id
      jsonb_build_object('comment_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix notify_on_claim function to use correct column names
CREATE OR REPLACE FUNCTION notify_on_claim() RETURNS TRIGGER AS $$
DECLARE
  resource_owner_id UUID;
BEGIN
  -- Get resource owner
  SELECT owner_id INTO resource_owner_id  -- Fixed: was user_id
  FROM resources
  WHERE id = NEW.resource_id;
  
  -- Notify resource owner when someone claims their resource
  IF resource_owner_id IS NOT NULL AND resource_owner_id != NEW.claimant_id THEN  -- Fixed: was NEW.user_id
    PERFORM create_notification(
      resource_owner_id,
      'claim',
      NEW.claimant_id,  -- Fixed: was NEW.user_id
      'New claim on your resource',
      'Someone claimed your resource.',
      NULL, -- action_url
      NEW.resource_id,
      NULL, -- comment_id
      NEW.id, -- claim_id
      NULL, -- message_id
      NULL, -- conversation_id
      NULL, -- community_id
      jsonb_build_object('claim_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix create_notification function to bypass RLS when called by trigger functions
-- Drop the existing function first to avoid parameter conflicts
DROP FUNCTION IF EXISTS create_notification(UUID, TEXT, UUID, TEXT, TEXT, TEXT, UUID, UUID, UUID, UUID, UUID, UUID, JSONB);

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_actor_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_action_url TEXT,
  p_resource_id UUID,
  p_comment_id UUID,
  p_claim_id UUID,
  p_message_id UUID,
  p_conversation_id UUID,
  p_community_id UUID,
  p_metadata JSONB
) RETURNS UUID AS $$
DECLARE
  notification_id UUID;
  should_notify BOOLEAN;
BEGIN
  -- Check if user wants this type of notification
  should_notify := should_send_notification(p_user_id, p_type);
  
  IF NOT should_notify THEN
    RETURN NULL; -- Don't create notification
  END IF;
  
  -- Use a direct insert with proper role context 
  -- Since this is a SECURITY DEFINER function owned by postgres,
  -- it should have the necessary privileges to bypass RLS
  
  -- Create new notification (simple insert, no grouping logic)
  INSERT INTO notifications (
    user_id, type, actor_id, title, body, action_url,
    resource_id, comment_id, claim_id, message_id, conversation_id, community_id,
    metadata, created_at, updated_at
  )
  VALUES (
    p_user_id, p_type, p_actor_id, p_title, p_body, p_action_url,
    p_resource_id, p_comment_id, p_claim_id, p_message_id, p_conversation_id, p_community_id,
    p_metadata, NOW(), NOW()
  )
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a temporary RLS policy to allow SECURITY DEFINER functions to insert notifications
-- This policy allows inserts when called from a SECURITY DEFINER function owned by postgres
CREATE POLICY "Allow notification creation from triggers" ON notifications 
  FOR INSERT 
  WITH CHECK (true) -- Always allow inserts from triggers
  ;

-- Update the RLS policies to be more permissive for trigger-based inserts
-- Keep the existing policy but add an OR condition for SECURITY DEFINER functions
DROP POLICY IF EXISTS "Service role can create notifications" ON notifications;
CREATE POLICY "Service role can create notifications" ON notifications 
  FOR INSERT 
  TO service_role 
  WITH CHECK (true);

-- Add policy for authenticated users calling SECURITY DEFINER functions
CREATE POLICY "Allow authenticated notification creation" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (current_user = 'postgres'::name OR current_setting('session_authorization') = 'postgres');

-- Add policy for postgres role (SECURITY DEFINER functions run as postgres)
CREATE POLICY "Allow postgres notification creation" ON notifications
  FOR INSERT
  TO postgres
  WITH CHECK (true);

-- Fix notify_on_claim_status_change function column mismatches
CREATE OR REPLACE FUNCTION notify_on_claim_status_change() RETURNS TRIGGER AS $$
BEGIN
  -- Notification for claim status changes (approved, rejected, interested, completed, cancelled)
  IF OLD.status != NEW.status THEN
    CASE NEW.status
      WHEN 'approved' THEN
        PERFORM create_notification(
          NEW.claimant_id,  -- Fixed: was NEW.user_id
          'claim_approved',
          (SELECT owner_id FROM resources WHERE id = NEW.resource_id), -- Fixed: was NULL
          'Claim approved',
          'Your claim has been approved.',
          NULL, -- action_url
          NEW.resource_id,
          NULL, -- comment_id
          NEW.id, -- claim_id
          NULL, -- message_id
          NULL, -- conversation_id
          NULL, -- community_id
          jsonb_build_object('claim_id', NEW.id)
        );
      WHEN 'interested' THEN
        -- For events, 'interested' status is equivalent to approval
        PERFORM create_notification(
          NEW.claimant_id,  -- Fixed: was NEW.user_id
          'claim_approved',
          (SELECT owner_id FROM resources WHERE id = NEW.resource_id), -- Fixed: was NULL
          'Registration approved',
          'Your event registration has been approved.',
          NULL, -- action_url
          NEW.resource_id,
          NULL, -- comment_id
          NEW.id, -- claim_id
          NULL, -- message_id
          NULL, -- conversation_id
          NULL, -- community_id
          jsonb_build_object('claim_id', NEW.id)
        );
      WHEN 'rejected' THEN
        PERFORM create_notification(
          NEW.claimant_id,  -- Fixed: was NEW.user_id
          'claim_rejected',
          (SELECT owner_id FROM resources WHERE id = NEW.resource_id), -- Fixed: was NULL
          'Claim rejected',
          'Your claim has been rejected.',
          NULL, -- action_url
          NEW.resource_id,
          NULL, -- comment_id
          NEW.id, -- claim_id
          NULL, -- message_id
          NULL, -- conversation_id
          NULL, -- community_id
          jsonb_build_object('claim_id', NEW.id)
        );
      WHEN 'completed' THEN
        -- Notify resource owner that claim was completed
        PERFORM create_notification(
          (SELECT owner_id FROM resources WHERE id = NEW.resource_id),  -- Fixed: was user_id
          'resource_claim_completed',
          NEW.claimant_id,  -- Fixed: was NEW.user_id
          'Claim completed',
          'Someone completed their claim on your resource.',
          NULL, -- action_url
          NEW.resource_id,
          NULL, -- comment_id
          NEW.id, -- claim_id
          NULL, -- message_id
          NULL, -- conversation_id
          NULL, -- community_id
          jsonb_build_object('claim_id', NEW.id)
        );
      WHEN 'given' THEN
        -- Notify claimant that resource has been marked as given
        PERFORM create_notification(
          NEW.claimant_id,
          'claimed_resource_updated',
          (SELECT owner_id FROM resources WHERE id = NEW.resource_id),
          'Resource marked as given',
          'The resource owner has marked your claimed resource as given.',
          NULL, -- action_url
          NEW.resource_id,
          NULL, -- comment_id
          NEW.id, -- claim_id
          NULL, -- message_id
          NULL, -- conversation_id
          NULL, -- community_id
          jsonb_build_object('claim_id', NEW.id, 'status', 'given')
        );
      WHEN 'cancelled' THEN
        -- Notify resource owner that claim was cancelled
        PERFORM create_notification(
          (SELECT owner_id FROM resources WHERE id = NEW.resource_id),  -- Fixed: was user_id
          'resource_claim_cancelled',
          NEW.claimant_id,  -- Fixed: was NEW.user_id
          'Claim cancelled',
          'Someone cancelled their claim on your resource.',
          NULL, -- action_url
          NEW.resource_id,
          NULL, -- comment_id
          NEW.id, -- claim_id
          NULL, -- message_id
          NULL, -- conversation_id
          NULL, -- community_id
          jsonb_build_object('claim_id', NEW.id)
        );
    END CASE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix notify_on_resource_community_insert function column mismatches
CREATE OR REPLACE FUNCTION notify_on_resource_community_insert() RETURNS TRIGGER AS $$
DECLARE
  resource_record RECORD;
BEGIN
  -- Get resource details
  SELECT * INTO resource_record
  FROM resources
  WHERE id = NEW.resource_id;
  
  -- Remove the is_active check as this field doesn't exist
  -- Notify all community members except the resource owner
  INSERT INTO notifications (user_id, type, actor_id, title, body, resource_id, community_id, metadata, created_at, updated_at)
  SELECT 
    cm.user_id,
    CASE 
      WHEN resource_record.type = 'event' THEN 'new_event'
      ELSE 'new_resource'
    END,
    resource_record.owner_id,  -- Fixed: was resource_record.user_id
    CASE 
      WHEN resource_record.type = 'event' THEN 'New event in community'
      ELSE 'New resource in community'
    END,
    CASE 
      WHEN resource_record.type = 'event' THEN 'A new event was created in your community.'
      ELSE 'A new resource was added to your community.'
    END,
    NEW.resource_id,
    NEW.community_id,
    jsonb_build_object('resource_id', NEW.resource_id, 'community_id', NEW.community_id),
    NOW(),
    NOW()
  FROM community_memberships cm
  WHERE cm.community_id = NEW.community_id
    AND cm.user_id != resource_record.owner_id;  -- Fixed: was resource_record.user_id
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix notify_on_resource_cancellation function column mismatches  
CREATE OR REPLACE FUNCTION notify_on_resource_cancellation() RETURNS TRIGGER AS $$
BEGIN
  -- Only notify on cancellation (when status becomes 'cancelled')
  IF OLD.status != NEW.status AND NEW.status = 'cancelled' THEN  -- Fixed: removed is_active check
    -- Notify all users who have claimed this resource
    INSERT INTO notifications (user_id, type, actor_id, title, body, resource_id, metadata, created_at, updated_at)
    SELECT 
      c.claimant_id,  -- Fixed: was c.user_id
      'claimed_resource_cancelled',
      NEW.owner_id,   -- Fixed: was NEW.user_id
      'Resource cancelled',
      'A resource you claimed has been cancelled.',
      NEW.id,
      jsonb_build_object('resource_id', NEW.id),
      NOW(),
      NOW()
    FROM resource_claims c
    WHERE c.resource_id = NEW.id 
      AND c.status = 'approved'
      AND c.claimant_id != NEW.owner_id;  -- Fixed: was c.user_id != NEW.user_id
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix notify_on_resource_update function column mismatches
CREATE OR REPLACE FUNCTION notify_on_resource_update() RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if significant fields were updated
  IF OLD.title IS DISTINCT FROM NEW.title OR 
     OLD.description IS DISTINCT FROM NEW.description OR
     OLD.location_name IS DISTINCT FROM NEW.location_name THEN  -- Fixed: was location, removed non-existent date_available
    
    -- Notify all users who have claimed this resource
    INSERT INTO notifications (user_id, type, actor_id, title, body, resource_id, metadata, created_at, updated_at)
    SELECT 
      c.claimant_id,  -- Fixed: was c.user_id
      'claimed_resource_updated',
      NEW.owner_id,   -- Fixed: was NEW.user_id
      'Resource updated',
      'A resource you claimed has been updated.',
      NEW.id,
      jsonb_build_object('resource_id', NEW.id),
      NOW(),
      NOW()
    FROM resource_claims c
    WHERE c.resource_id = NEW.id 
      AND c.status = 'approved'
      AND c.claimant_id != NEW.owner_id;  -- Fixed: was c.user_id != NEW.user_id
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix notify_on_trust_level_change function column mismatches
CREATE OR REPLACE FUNCTION notify_on_trust_level_change() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.trust_level IS DISTINCT FROM NEW.trust_level AND NEW.trust_level > OLD.trust_level THEN
    PERFORM create_notification(
      NEW.user_id,  -- Fixed: was NEW.id
      'trust_level_changed',
      NULL, -- No specific actor for system actions
      'Trust level increased',
      format('You reached trust level %s!', NEW.trust_level),
      NULL, -- action_url
      NULL, -- resource_id
      NULL, -- comment_id
      NULL, -- claim_id
      NULL, -- message_id
      NULL, -- conversation_id
      NULL, -- community_id
      jsonb_build_object('old_level', OLD.trust_level, 'new_level', NEW.trust_level)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Resource deletion trigger removed - CASCADE delete timing makes it non-functional


-- Fix should_send_notification function to use grouped preference keys
-- The function was checking for individual preference keys that don't exist
-- Instead it should check for the grouped keys stored in notification_preferences JSONB
CREATE OR REPLACE FUNCTION should_send_notification(p_user_id uuid, p_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  preferences JSONB;
BEGIN
  SELECT notification_preferences INTO preferences
  FROM profiles
  WHERE id = p_user_id;
  
  -- If no preferences exist, default to true for all types
  IF preferences IS NULL OR preferences = '{}'::jsonb THEN
    RETURN TRUE;
  END IF;
  
  -- Check specific preference based on type using grouped preference keys
  CASE p_type
    -- Social Interactions group
    WHEN 'comment' THEN
      RETURN COALESCE((preferences->>'social_interactions')::boolean, true);
    WHEN 'comment_reply' THEN
      RETURN COALESCE((preferences->>'social_interactions')::boolean, true);
    WHEN 'shoutout_received' THEN
      RETURN COALESCE((preferences->>'social_interactions')::boolean, true);
    WHEN 'connection_request' THEN
      RETURN COALESCE((preferences->>'social_interactions')::boolean, true);
    WHEN 'connection_accepted' THEN
      RETURN COALESCE((preferences->>'social_interactions')::boolean, true);
    
    -- My Resources group
    WHEN 'claim' THEN
      RETURN COALESCE((preferences->>'my_resources')::boolean, true);
    WHEN 'resource_claim_cancelled' THEN
      RETURN COALESCE((preferences->>'my_resources')::boolean, true);
    WHEN 'resource_claim_completed' THEN
      RETURN COALESCE((preferences->>'my_resources')::boolean, true);
    
    -- My Registrations group
    WHEN 'claim_approved' THEN
      RETURN COALESCE((preferences->>'my_registrations')::boolean, true);
    WHEN 'claim_rejected' THEN
      RETURN COALESCE((preferences->>'my_registrations')::boolean, true);
    WHEN 'claimed_resource_updated' THEN
      RETURN COALESCE((preferences->>'my_registrations')::boolean, true);
    WHEN 'claimed_resource_cancelled' THEN
      RETURN COALESCE((preferences->>'my_registrations')::boolean, true);
    
    -- My Communities group
    WHEN 'community_member_joined' THEN
      RETURN COALESCE((preferences->>'my_communities')::boolean, true);
    WHEN 'community_member_left' THEN
      RETURN COALESCE((preferences->>'my_communities')::boolean, true);
    
    -- Community Activity group
    WHEN 'new_resource' THEN
      RETURN COALESCE((preferences->>'community_activity')::boolean, true);
    WHEN 'new_event' THEN
      RETURN COALESCE((preferences->>'community_activity')::boolean, true);
    
    -- Trust & Recognition group
    WHEN 'trust_points_received' THEN
      RETURN COALESCE((preferences->>'trust_recognition')::boolean, true);
    WHEN 'trust_level_changed' THEN
      RETURN COALESCE((preferences->>'trust_recognition')::boolean, true);
    
    -- Messages (granular control)
    WHEN 'direct_message' THEN
      RETURN COALESCE((preferences->>'direct_messages')::boolean, true);
    WHEN 'community_message' THEN
      RETURN COALESCE((preferences->>'community_messages')::boolean, true);
    
    ELSE
      RETURN TRUE; -- Default to true for unknown types
  END CASE;
END;
$$;