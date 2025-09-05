-- Enhance notification system with enum types and proper metadata handling

-- Create enum for notification types
CREATE TYPE notification_type AS ENUM (
  -- Existing types (5)
  'comment',
  'comment_reply', 
  'claim',
  'message',
  'new_resource',
  -- Social Interactions (2)
  'shoutout_received',
  'connection_accepted',
  -- My Resources (2)
  'resource_claim_cancelled',
  'resource_claim_completed',
  -- My Registrations (4)
  'claim_approved',
  'claim_rejected',
  'claimed_resource_updated',
  'claimed_resource_cancelled',
  -- My Communities (2)
  'community_member_joined',
  'community_member_left',
  -- Community Activity (1)
  'new_event',
  -- Trust & Recognition (2)
  'trust_points_changed',
  'trust_level_changed'
);

-- Drop dependent view temporarily
DROP VIEW IF EXISTS notification_details;

-- Drop the old check constraint that compares to text
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Convert the type column to use the enum
ALTER TABLE notifications ALTER COLUMN type TYPE notification_type USING type::notification_type;

-- Recreate the notification_details view
CREATE VIEW notification_details AS
SELECT 
  n.id,
  n.user_id,
  n.type,
  n.resource_id,
  n.comment_id,
  n.claim_id,
  n.community_id,
  n.shoutout_id,
  n.actor_id,
  n.metadata,
  n.is_read,
  n.read_at,
  n.created_at,
  n.updated_at,
  
  -- Actor information
  up_actor.full_name as actor_display_name,
  up_actor.avatar_url as actor_avatar_url,
  
  -- Resource information
  r.title as resource_title,
  r.type as resource_type,
  
  -- Community information
  c.name as community_name,
  c.icon as community_avatar_url,
  
  -- Comment information
  comm.content as comment_content,
  
  -- Shoutout information  
  s.message as shoutout_message,
  
  -- Claim information
  rc.status as claim_status
  
FROM notifications n
LEFT JOIN public_profiles up_actor ON n.actor_id = up_actor.id
LEFT JOIN resources r ON n.resource_id = r.id
LEFT JOIN communities c ON n.community_id = c.id
LEFT JOIN comments comm ON n.comment_id = comm.id
LEFT JOIN shoutouts s ON n.shoutout_id = s.id
LEFT JOIN resource_claims rc ON n.claim_id = rc.id;

-- Drop old function versions to avoid conflicts
DROP FUNCTION IF EXISTS create_notification_base(UUID, TEXT, UUID, UUID, UUID, UUID, UUID, UUID);
DROP FUNCTION IF EXISTS should_send_notification(UUID, TEXT);
DROP FUNCTION IF EXISTS notify_trust_points(UUID, UUID);
DROP FUNCTION IF EXISTS notify_trust_level_change(UUID, UUID);
DROP FUNCTION IF EXISTS notify_resource_updated(UUID, UUID, UUID, UUID, UUID);
DROP FUNCTION IF EXISTS notify_shoutout(UUID, UUID, UUID, UUID);
DROP FUNCTION IF EXISTS notify_comment(UUID, UUID, UUID, UUID, UUID);
DROP FUNCTION IF EXISTS notify_comment_reply(UUID, UUID, UUID, UUID, UUID, UUID);
DROP FUNCTION IF EXISTS notify_new_resource(UUID, UUID, UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS notify_new_message();
DROP FUNCTION IF EXISTS create_notification(UUID, TEXT, UUID, TEXT, TEXT, TEXT, UUID, UUID, UUID, UUID, UUID, UUID, JSONB);

-- Update should_send_notification to work with the enum
CREATE OR REPLACE FUNCTION should_send_notification(p_user_id UUID, p_type notification_type)
RETURNS BOOLEAN LANGUAGE plpgsql AS $function$
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
    WHEN 'trust_points_changed' THEN
      RETURN COALESCE((preferences->>'trust_recognition')::boolean, true);
    WHEN 'trust_level_changed' THEN
      RETURN COALESCE((preferences->>'trust_recognition')::boolean, true);
    
    -- Messages (granular control)
    WHEN 'message' THEN
      RETURN COALESCE((preferences->>'direct_messages')::boolean, true);
    
    ELSE
      RETURN TRUE; -- Default to true for unknown types
  END CASE;
END;
$function$;

-- Update create_notification_base to accept metadata parameter
CREATE OR REPLACE FUNCTION create_notification_base(
  p_user_id UUID, 
  p_type notification_type, 
  p_actor_id UUID DEFAULT NULL, 
  p_resource_id UUID DEFAULT NULL, 
  p_comment_id UUID DEFAULT NULL, 
  p_claim_id UUID DEFAULT NULL, 
  p_community_id UUID DEFAULT NULL, 
  p_shoutout_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE
  notification_id UUID;
BEGIN
  -- Check notification preferences
  IF NOT should_send_notification(p_user_id, p_type) THEN
    RETURN NULL;
  END IF;
  
  -- Insert notification with metadata
  INSERT INTO notifications (
    user_id, type, actor_id,
    resource_id, comment_id, claim_id, 
    community_id, shoutout_id, metadata,
    created_at, updated_at
  ) VALUES (
    p_user_id, p_type, p_actor_id,
    p_resource_id, p_comment_id, p_claim_id,
    p_community_id, p_shoutout_id, p_metadata,
    NOW(), NOW()
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$function$;

-- Update trust points notification function to use trust_points_changed with positive/negative amount
CREATE OR REPLACE FUNCTION notify_trust_points(p_user_id UUID, p_community_id UUID, p_points_change INTEGER DEFAULT NULL, p_new_score INTEGER DEFAULT NULL, p_old_score INTEGER DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql AS $function$
DECLARE
  metadata_json JSONB := '{}';
BEGIN
  -- Build metadata with score change information (positive or negative amount)
  IF p_points_change IS NOT NULL THEN
    metadata_json := jsonb_build_object('amount', p_points_change);
    
    -- Add score values if provided
    IF p_new_score IS NOT NULL THEN
      metadata_json := metadata_json || jsonb_build_object('new_score', p_new_score);
    END IF;
    
    IF p_old_score IS NOT NULL THEN
      metadata_json := metadata_json || jsonb_build_object('old_score', p_old_score);
    END IF;
  END IF;

  RETURN create_notification_base(
    p_user_id := p_user_id,
    p_type := 'trust_points_changed',
    p_community_id := p_community_id,
    p_metadata := metadata_json
  );
END;
$function$;

-- Update trust level change notification function to include level information
CREATE OR REPLACE FUNCTION notify_trust_level_change(p_user_id UUID, p_community_id UUID, p_old_level INTEGER DEFAULT NULL, p_new_level INTEGER DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql AS $function$
DECLARE
  metadata_json JSONB := '{}';
BEGIN
  -- Add level change information to metadata
  IF p_old_level IS NOT NULL AND p_new_level IS NOT NULL THEN
    metadata_json := jsonb_build_object(
      'old_level', p_old_level,
      'new_level', p_new_level
    );
  END IF;

  RETURN create_notification_base(
    p_user_id := p_user_id,
    p_type := 'trust_level_changed',
    p_community_id := p_community_id,
    p_metadata := metadata_json
  );
END;
$function$;

-- Update resource update notification to include what changed
CREATE OR REPLACE FUNCTION notify_resource_updated(p_user_id UUID, p_actor_id UUID, p_resource_id UUID, p_claim_id UUID DEFAULT NULL, p_community_id UUID DEFAULT NULL, p_changes TEXT[] DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql AS $function$
DECLARE
  metadata_json JSONB := '{}';
BEGIN
  -- Add information about what changed
  IF p_changes IS NOT NULL AND array_length(p_changes, 1) > 0 THEN
    metadata_json := jsonb_build_object('changes', p_changes);
  END IF;

  RETURN create_notification_base(
    p_user_id := p_user_id,
    p_type := 'claimed_resource_updated',
    p_actor_id := p_actor_id,
    p_resource_id := p_resource_id,
    p_claim_id := p_claim_id,
    p_community_id := p_community_id,
    p_metadata := metadata_json
  );
END;
$function$;

-- Update shoutout notification to include shoutout content in metadata
CREATE OR REPLACE FUNCTION notify_shoutout(p_user_id UUID, p_actor_id UUID, p_shoutout_id UUID, p_community_id UUID, p_content TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql AS $function$
DECLARE
  metadata_json JSONB := '{}';
BEGIN
  -- Add shoutout content preview to metadata (truncated for notifications)
  IF p_content IS NOT NULL THEN
    metadata_json := jsonb_build_object(
      'content_preview', LEFT(p_content, 100)
    );
  END IF;

  RETURN create_notification_base(
    p_user_id := p_user_id,
    p_type := 'shoutout_received',
    p_actor_id := p_actor_id,
    p_shoutout_id := p_shoutout_id,
    p_community_id := p_community_id,
    p_metadata := metadata_json
  );
END;
$function$;

-- Update comment notification to include comment content preview in metadata
CREATE OR REPLACE FUNCTION notify_comment(p_user_id UUID, p_actor_id UUID, p_resource_id UUID, p_comment_id UUID, p_community_id UUID DEFAULT NULL, p_content TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql AS $function$
DECLARE
  metadata_json JSONB := '{}';
BEGIN
  -- Add comment content preview to metadata
  IF p_content IS NOT NULL THEN
    metadata_json := jsonb_build_object(
      'content_preview', LEFT(p_content, 100)
    );
  END IF;

  RETURN create_notification_base(
    p_user_id := p_user_id,
    p_type := 'comment',
    p_actor_id := p_actor_id,
    p_resource_id := p_resource_id,
    p_comment_id := p_comment_id,
    p_community_id := p_community_id,
    p_metadata := metadata_json
  );
END;
$function$;

-- Update comment reply notification to include comment content preview in metadata
CREATE OR REPLACE FUNCTION notify_comment_reply(p_user_id UUID, p_actor_id UUID, p_resource_id UUID, p_comment_id UUID, p_parent_comment_id UUID, p_community_id UUID DEFAULT NULL, p_content TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql AS $function$
DECLARE
  metadata_json JSONB := '{}';
BEGIN
  -- Add comment content preview to metadata
  IF p_content IS NOT NULL THEN
    metadata_json := jsonb_build_object(
      'content_preview', LEFT(p_content, 100)
    );
  END IF;

  RETURN create_notification_base(
    p_user_id := p_user_id,
    p_type := 'comment_reply',
    p_actor_id := p_actor_id,
    p_resource_id := p_resource_id,
    p_comment_id := p_comment_id,
    p_community_id := p_community_id,
    p_metadata := metadata_json
  );
END;
$function$;

-- Update the comment trigger to pass comment content
CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE
  resource_owner_id UUID;
  parent_comment_author_id UUID;
  resource_community_id UUID;
BEGIN
  -- Get resource owner and community
  SELECT owner_id INTO resource_owner_id
  FROM resources
  WHERE id = NEW.resource_id;
  
  -- Get community if resource is in one
  SELECT community_id INTO resource_community_id
  FROM resource_communities
  WHERE resource_id = NEW.resource_id
  LIMIT 1;
  
  -- If this is a reply to another comment, get the parent comment author
  IF NEW.parent_id IS NOT NULL THEN
    SELECT author_id INTO parent_comment_author_id
    FROM comments
    WHERE id = NEW.parent_id;
    
    -- Notify parent comment author if they're not the commenter
    IF parent_comment_author_id IS NOT NULL AND parent_comment_author_id != NEW.author_id THEN
      PERFORM notify_comment_reply(
        parent_comment_author_id,
        NEW.author_id,
        NEW.resource_id,
        NEW.id,
        NEW.parent_id,
        resource_community_id,
        NEW.content
      );
    END IF;
  END IF;
  
  -- Notify resource owner if they're not the commenter and not already notified as parent author
  IF resource_owner_id IS NOT NULL 
     AND resource_owner_id != NEW.author_id
     AND (parent_comment_author_id IS NULL OR resource_owner_id != parent_comment_author_id) THEN
    PERFORM notify_comment(
      resource_owner_id,
      NEW.author_id,
      NEW.resource_id,
      NEW.id,
      resource_community_id,
      NEW.content
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update notify_new_resource to work with resource_type enum (not TEXT)
CREATE OR REPLACE FUNCTION notify_new_resource(p_user_id UUID, p_actor_id UUID, p_resource_id UUID, p_community_id UUID, p_resource_type resource_type)
RETURNS UUID LANGUAGE plpgsql AS $function$
DECLARE
  notification_type notification_type;
BEGIN
  -- Determine notification type based on resource type
  IF p_resource_type = 'event' THEN
    notification_type := 'new_event';
  ELSE
    notification_type := 'new_resource';
  END IF;
  
  RETURN create_notification_base(
    p_user_id := p_user_id,
    p_type := notification_type,
    p_actor_id := p_actor_id,
    p_resource_id := p_resource_id,
    p_community_id := p_community_id
  );
END;
$function$;

-- Recreate notify_new_message function to work with enum
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE
    sender_name TEXT;
    receiver_id UUID;
BEGIN
    -- Get sender's display name
    SELECT display_name INTO sender_name
    FROM public.profiles
    WHERE id = NEW.sender_id;

    -- Find the other participant in the conversation (receiver)
    SELECT user_id INTO receiver_id
    FROM public.conversation_participants
    WHERE conversation_id = NEW.conversation_id
      AND user_id != NEW.sender_id
    LIMIT 1;

    -- Create notification for the receiver using create_notification_base
    IF receiver_id IS NOT NULL THEN
        PERFORM create_notification_base(
            p_user_id := receiver_id,
            p_type := 'message',
            p_actor_id := NEW.sender_id,
            p_metadata := jsonb_build_object(
                'conversation_id', NEW.conversation_id,
                'message_id', NEW.id,
                'content_preview', CASE 
                    WHEN LENGTH(NEW.content) > 50 
                    THEN LEFT(NEW.content, 50) || '...'
                    ELSE NEW.content
                END
            )
        );
    END IF;

    RETURN NEW;
END;
$function$;

-- Recreate create_notification function to work with enum
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type notification_type,
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
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE
  notification_id UUID;
  should_notify BOOLEAN;
BEGIN
  -- Check if user wants this type of notification
  should_notify := should_send_notification(p_user_id, p_type);
  
  IF NOT should_notify THEN
    RETURN NULL; -- Don't create notification
  END IF;
  
  -- Create new notification
  INSERT INTO notifications (
    user_id, type, actor_id,
    resource_id, comment_id, claim_id, community_id,
    metadata, created_at, updated_at
  )
  VALUES (
    p_user_id, p_type, p_actor_id,
    p_resource_id, p_comment_id, p_claim_id, p_community_id,
    p_metadata, NOW(), NOW()
  )
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$function$;

-- Fix the trust points trigger to pass the correct parameters with amount
-- First update the trigger function to pass the amount and scores
CREATE OR REPLACE FUNCTION notify_on_trust_points()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE
  score_change INTEGER;
  old_score INTEGER;
  new_score INTEGER;
BEGIN
  -- Get score values
  old_score := COALESCE(OLD.score, 0);
  new_score := NEW.score;
  score_change := new_score - old_score;
  
  -- Notify on any score change (positive or negative)
  IF score_change != 0 THEN
    PERFORM notify_trust_points(
      NEW.user_id,
      NEW.community_id,
      score_change,
      new_score,
      old_score
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger 
DROP TRIGGER IF EXISTS trust_points_notification_trigger ON trust_scores;
CREATE TRIGGER trust_points_notification_trigger
  AFTER UPDATE ON trust_scores
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_trust_points();
