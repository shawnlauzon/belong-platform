-- Remove database-side notification grouping and count system
-- Each action now creates one notification record
-- UI handles grouping for display purposes

-- Drop the update_notification_count function
DROP FUNCTION IF EXISTS update_notification_count(uuid, integer);

-- Drop the entire user_state table since it's not needed
DROP TABLE IF EXISTS user_state;

-- Remove database-side grouping columns from notifications table
ALTER TABLE notifications DROP COLUMN IF EXISTS group_key;
ALTER TABLE notifications DROP COLUMN IF EXISTS actor_count;

-- Replace complex create_or_update_notification with simple create_notification function
DROP FUNCTION IF EXISTS create_or_update_notification(UUID, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID, UUID, UUID, UUID, JSONB);

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_actor_id UUID DEFAULT NULL,
  p_title TEXT DEFAULT NULL,
  p_body TEXT DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_comment_id UUID DEFAULT NULL,
  p_claim_id UUID DEFAULT NULL,
  p_message_id UUID DEFAULT NULL,
  p_conversation_id UUID DEFAULT NULL,
  p_community_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
  should_notify BOOLEAN;
BEGIN
  -- Check if user wants this type of notification
  should_notify := should_send_notification(p_user_id, p_type);
  
  IF NOT should_notify THEN
    RETURN NULL; -- Don't create notification
  END IF;
  
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
$$;

-- Remove the update_counts_on_read trigger and function
DROP TRIGGER IF EXISTS update_counts_on_read ON notifications;
DROP TRIGGER IF EXISTS notification_read_trigger ON notifications;
DROP FUNCTION IF EXISTS update_counts_on_read();

-- Update all trigger functions to use the new simple create_notification function
-- Note: Remove group_key parameter since we're no longer doing database-side grouping

-- Update notify_on_shoutout function
CREATE OR REPLACE FUNCTION notify_on_shoutout() RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_notification(
    NEW.recipient_id,
    'shoutout_received',
    NEW.giver_id,
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
$$ LANGUAGE plpgsql;

-- Update notify_on_connection_request function
CREATE OR REPLACE FUNCTION notify_on_connection_request() RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_notification(
    NEW.initiator_id,
    'connection_request',
    NEW.requester_id,
    'New connection request',
    'Someone wants to connect with you.',
    NULL, -- action_url
    NULL, -- resource_id
    NULL, -- comment_id
    NULL, -- claim_id
    NULL, -- message_id
    NULL, -- conversation_id
    NEW.community_id,
    jsonb_build_object('request_id', NEW.id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update notify_on_connection_accepted function
CREATE OR REPLACE FUNCTION notify_on_connection_accepted() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != 'accepted' AND NEW.status = 'accepted' THEN
    PERFORM create_notification(
      NEW.requester_id,
      'connection_accepted',
      NEW.initiator_id,
      'Connection request accepted',
      'Your connection request was accepted.',
      NULL, -- action_url
      NULL, -- resource_id
      NULL, -- comment_id
      NULL, -- claim_id
      NULL, -- message_id
      NULL, -- conversation_id
      NEW.community_id,
      jsonb_build_object('request_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update notify_on_claim_status_change function
CREATE OR REPLACE FUNCTION notify_on_claim_status_change() RETURNS TRIGGER AS $$
BEGIN
  -- Notification for claim status changes (approved, rejected, completed, cancelled)
  IF OLD.status != NEW.status THEN
    CASE NEW.status
      WHEN 'approved' THEN
        PERFORM create_notification(
          NEW.user_id,
          'claim_approved',
          NULL, -- No specific actor for system actions
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
      WHEN 'rejected' THEN
        PERFORM create_notification(
          NEW.user_id,
          'claim_rejected',
          NULL, -- No specific actor for system actions
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
          (SELECT user_id FROM resources WHERE id = NEW.resource_id),
          'resource_claim_completed',
          NEW.user_id,
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
      WHEN 'cancelled' THEN
        -- Notify resource owner that claim was cancelled
        PERFORM create_notification(
          (SELECT user_id FROM resources WHERE id = NEW.resource_id),
          'resource_claim_cancelled',
          NEW.user_id,
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
$$ LANGUAGE plpgsql;

-- Update notify_on_resource_update function
CREATE OR REPLACE FUNCTION notify_on_resource_update() RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if significant fields were updated
  IF OLD.title IS DISTINCT FROM NEW.title OR 
     OLD.description IS DISTINCT FROM NEW.description OR
     OLD.location IS DISTINCT FROM NEW.location OR
     OLD.date_available IS DISTINCT FROM NEW.date_available THEN
    
    -- Notify all users who have claimed this resource
    INSERT INTO notifications (user_id, type, actor_id, title, body, resource_id, metadata, created_at, updated_at)
    SELECT 
      c.user_id,
      'claimed_resource_updated',
      NEW.user_id,
      'Resource updated',
      'A resource you claimed has been updated.',
      NEW.id,
      jsonb_build_object('resource_id', NEW.id),
      NOW(),
      NOW()
    FROM resource_claims c
    WHERE c.resource_id = NEW.id 
      AND c.status = 'approved'
      AND c.user_id != NEW.user_id; -- Don't notify the resource owner
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update notify_on_resource_cancellation function
CREATE OR REPLACE FUNCTION notify_on_resource_cancellation() RETURNS TRIGGER AS $$
BEGIN
  -- Only notify on cancellation (when is_active becomes false)
  IF OLD.is_active = true AND NEW.is_active = false THEN
    -- Notify all users who have claimed this resource
    INSERT INTO notifications (user_id, type, actor_id, title, body, resource_id, metadata, created_at, updated_at)
    SELECT 
      c.user_id,
      'claimed_resource_cancelled',
      NEW.user_id,
      'Resource cancelled',
      'A resource you claimed has been cancelled.',
      NEW.id,
      jsonb_build_object('resource_id', NEW.id),
      NOW(),
      NOW()
    FROM resource_claims c
    WHERE c.resource_id = NEW.id 
      AND c.status = 'approved'
      AND c.user_id != NEW.user_id; -- Don't notify the resource owner
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update notify_on_membership_join function
CREATE OR REPLACE FUNCTION notify_on_membership_join() RETURNS TRIGGER AS $$
BEGIN
  -- Notify community organizers when someone joins
  INSERT INTO notifications (user_id, type, actor_id, title, body, community_id, metadata, created_at, updated_at)
  SELECT 
    cm.user_id,
    'community_member_joined',
    NEW.user_id,
    'New community member',
    'Someone joined your community.',
    NEW.community_id,
    jsonb_build_object('community_id', NEW.community_id, 'member_id', NEW.user_id),
    NOW(),
    NOW()
  FROM community_memberships cm
  WHERE cm.community_id = NEW.community_id
    AND cm.role = 'organizer'
    AND cm.user_id != NEW.user_id; -- Don't notify the person who just joined
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update notify_on_membership_leave function
CREATE OR REPLACE FUNCTION notify_on_membership_leave() RETURNS TRIGGER AS $$
BEGIN
  -- Notify community organizers when someone leaves
  INSERT INTO notifications (user_id, type, actor_id, title, body, community_id, metadata, created_at, updated_at)
  SELECT 
    cm.user_id,
    'community_member_left',
    OLD.user_id,
    'Member left community',
    'Someone left your community.',
    OLD.community_id,
    jsonb_build_object('community_id', OLD.community_id, 'member_id', OLD.user_id),
    NOW(),
    NOW()
  FROM community_memberships cm
  WHERE cm.community_id = OLD.community_id
    AND cm.role = 'organizer'
    AND cm.user_id != OLD.user_id; -- Don't notify the person who left
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Update notify_on_trust_points function
CREATE OR REPLACE FUNCTION notify_on_trust_points() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.points > 0 THEN -- Only notify on points gained
    PERFORM create_notification(
      NEW.user_id,
      'trust_points_received',
      NULL, -- No specific actor for system actions
      'Trust points received',
      format('You received %s trust points.', NEW.points),
      NULL, -- action_url
      NULL, -- resource_id
      NULL, -- comment_id
      NULL, -- claim_id
      NULL, -- message_id
      NULL, -- conversation_id
      NULL, -- community_id
      jsonb_build_object('points', NEW.points, 'reason', NEW.reason)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update notify_on_trust_level_change function
CREATE OR REPLACE FUNCTION notify_on_trust_level_change() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.trust_level IS DISTINCT FROM NEW.trust_level AND NEW.trust_level > OLD.trust_level THEN
    PERFORM create_notification(
      NEW.id,
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
$$ LANGUAGE plpgsql;

-- Update notify_on_resource_community_insert function
CREATE OR REPLACE FUNCTION notify_on_resource_community_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  resource_record RECORD;
BEGIN
  -- Get resource details
  SELECT * INTO resource_record
  FROM resources
  WHERE id = NEW.resource_id;
  
  -- Only notify for active resources
  IF resource_record.is_active THEN
    -- Notify all community members except the resource owner
    INSERT INTO notifications (user_id, type, actor_id, title, body, resource_id, community_id, metadata, created_at, updated_at)
    SELECT 
      cm.user_id,
      CASE 
        WHEN resource_record.type = 'event' THEN 'new_event'
        ELSE 'new_resource'
      END,
      resource_record.user_id,
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
      AND cm.user_id != resource_record.user_id; -- Don't notify the resource creator
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update notify_on_comment function
CREATE OR REPLACE FUNCTION notify_on_comment() RETURNS TRIGGER AS $$
DECLARE
  resource_owner_id UUID;
  parent_comment_author_id UUID;
BEGIN
  -- Get resource owner
  SELECT user_id INTO resource_owner_id
  FROM resources
  WHERE id = NEW.resource_id;
  
  -- If this is a reply to another comment, get the parent comment author
  IF NEW.parent_comment_id IS NOT NULL THEN
    SELECT user_id INTO parent_comment_author_id
    FROM comments
    WHERE id = NEW.parent_comment_id;
    
    -- Notify parent comment author if they're not the commenter
    IF parent_comment_author_id IS NOT NULL AND parent_comment_author_id != NEW.user_id THEN
      PERFORM create_notification(
        parent_comment_author_id,
        'comment_reply',
        NEW.user_id,
        'Reply to your comment',
        'Someone replied to your comment.',
        NULL, -- action_url
        NEW.resource_id,
        NEW.id, -- comment_id
        NULL, -- claim_id
        NULL, -- message_id
        NULL, -- conversation_id
        NULL, -- community_id
        jsonb_build_object('comment_id', NEW.id, 'parent_comment_id', NEW.parent_comment_id)
      );
    END IF;
  END IF;
  
  -- Notify resource owner if they're not the commenter and not already notified as parent author
  IF resource_owner_id IS NOT NULL 
     AND resource_owner_id != NEW.user_id 
     AND (parent_comment_author_id IS NULL OR resource_owner_id != parent_comment_author_id) THEN
    PERFORM create_notification(
      resource_owner_id,
      'comment',
      NEW.user_id,
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
$$ LANGUAGE plpgsql;

-- Update notify_on_claim function  
CREATE OR REPLACE FUNCTION notify_on_claim() RETURNS TRIGGER AS $$
DECLARE
  resource_owner_id UUID;
BEGIN
  -- Get resource owner
  SELECT user_id INTO resource_owner_id
  FROM resources
  WHERE id = NEW.resource_id;
  
  -- Notify resource owner when someone claims their resource
  IF resource_owner_id IS NOT NULL AND resource_owner_id != NEW.user_id THEN
    PERFORM create_notification(
      resource_owner_id,
      'claim',
      NEW.user_id,
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
$$ LANGUAGE plpgsql;

-- Update the handle_new_user function to remove user_state creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email text;
  user_meta jsonb;
  invitation_code text;
  member_code_record RECORD;
BEGIN
  -- Get the email, handling potential null values
  user_email := COALESCE(NEW.email, '');
  
  -- Ensure user_metadata is never null
  user_meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  
  -- Log the attempt for debugging
  RAISE LOG 'Creating profile for user: % with email: % and metadata: %', NEW.id, user_email, user_meta;
  
  -- Insert the profile with error handling and default notification preferences
  INSERT INTO public.profiles (
    id, 
    email, 
    user_metadata,
    notification_preferences,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    user_email,
    user_meta,
    -- Default notification preferences as JSONB (group-level only)
    jsonb_build_object(
      'social_interactions', true,
      'my_resources', true,
      'my_registrations', true,
      'my_communities', true,
      'community_activity', true,
      'trust_recognition', true,
      'direct_messages', true,
      'community_messages', true,
      'email_enabled', false,
      'push_enabled', false
    ),
    COALESCE(NEW.created_at, now()),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    user_metadata = EXCLUDED.user_metadata,
    updated_at = now();
  
  RAISE LOG 'Successfully created profile for user: %', NEW.id;
  
  -- Process invitation code if present (existing logic)
  invitation_code := user_meta ->> 'invitation_code';
  
  IF invitation_code IS NOT NULL AND invitation_code != '' THEN
    RAISE LOG 'Processing invitation code: % for user: %', invitation_code, NEW.id;
    
    -- Find the connection code to get community info
    SELECT cmc.*, c.id as community_id, c.name as community_name
    INTO member_code_record
    FROM community_member_codes cmc
    JOIN communities c ON c.id = cmc.community_id
    WHERE cmc.code = invitation_code
      AND cmc.is_active = true;
    
    IF FOUND THEN
      RAISE LOG 'Found active invitation code: % for community: %', invitation_code, member_code_record.community_name;
      
      -- Auto-join the community
      INSERT INTO community_memberships (community_id, user_id, created_at, updated_at)
      VALUES (member_code_record.community_id, NEW.id, now(), now())
      ON CONFLICT (community_id, user_id) DO NOTHING;
      
      RAISE LOG 'User % automatically joined community: %', NEW.id, member_code_record.community_name;
      
      -- Create connection request with the invitation originator
      INSERT INTO connection_requests (
        community_id,
        initiator_id,
        requester_id,
        status,
        created_at,
        expires_at
      )
      VALUES (
        member_code_record.community_id,
        member_code_record.created_by,
        NEW.id,
        'pending',
        now(),
        now() + interval '7 days'
      )
      ON CONFLICT (community_id, initiator_id, requester_id) DO NOTHING;
      
      RAISE LOG 'Created connection request for user % with originator %', NEW.id, member_code_record.created_by;
    ELSE
      RAISE LOG 'Invalid or expired invitation code: %', invitation_code;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Handle unique constraint violations (user already exists)
    RAISE WARNING 'User profile already exists for user %', NEW.id;
    RETURN NEW;
    
  WHEN foreign_key_violation THEN
    -- Handle foreign key constraint violations
    RAISE WARNING 'Foreign key violation creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
    
  WHEN check_violation THEN
    -- Handle check constraint violations
    RAISE WARNING 'Check constraint violation creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
    
  WHEN not_null_violation THEN
    -- Handle not null constraint violations
    RAISE WARNING 'Not null violation creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
    
  WHEN OTHERS THEN
    -- Handle any other errors
    RAISE WARNING 'Unexpected error creating profile for user %: %', NEW.id, SQLERRM;
    -- Still return NEW to allow user creation to proceed
    RETURN NEW;
END;
$$;