-- Consolidate user data tables
-- 1. Move notification preferences to profiles JSONB column
-- 2. Replace notification_counts with simplified user_state table
-- 3. Remove seen_resources table  
-- 4. Update all related functions

-- Step 1: Add notification_preferences column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}';

-- Step 2: Migrate existing notification preferences to profiles
UPDATE profiles SET notification_preferences = (
  SELECT jsonb_build_object(
    'social_interactions', COALESCE(np.social_interactions, true),
    'my_resources', COALESCE(np.my_resources, true),
    'my_registrations', COALESCE(np.my_registrations, true),
    'my_communities', COALESCE(np.my_communities, true),
    'community_activity', COALESCE(np.community_activity, true),
    'trust_recognition', COALESCE(np.trust_recognition, true),
    'direct_messages', COALESCE(np.direct_messages, true),
    'community_messages', COALESCE(np.community_messages, true),
    'email_enabled', COALESCE(np.email_enabled, false),
    'push_enabled', COALESCE(np.push_enabled, false),
    -- Individual notification type preferences
    'comments_on_resources', COALESCE(np.comments_on_resources, true),
    'comment_replies', COALESCE(np.comment_replies, true),
    'shoutout_received', COALESCE(np.shoutout_received, true),
    'connection_request', COALESCE(np.connection_request, true),
    'connection_accepted', COALESCE(np.connection_accepted, true),
    'resource_claims', COALESCE(np.resource_claims, true),
    'resource_claim_cancelled', COALESCE(np.resource_claim_cancelled, true),
    'resource_claim_completed', COALESCE(np.resource_claim_completed, true),
    'claim_approved', COALESCE(np.claim_approved, true),
    'claim_rejected', COALESCE(np.claim_rejected, true),
    'claimed_resource_updated', COALESCE(np.claimed_resource_updated, true),
    'claimed_resource_cancelled', COALESCE(np.claimed_resource_cancelled, true),
    'community_member_joined', COALESCE(np.community_member_joined, true),
    'community_member_left', COALESCE(np.community_member_left, true),
    'community_resources', COALESCE(np.community_resources, true),
    'new_event', COALESCE(np.new_event, true),
    'trust_points_received', COALESCE(np.trust_points_received, true),
    'trust_level_changed', COALESCE(np.trust_level_changed, true)
  )
  FROM notification_preferences np
  WHERE np.user_id = profiles.id
)
WHERE EXISTS (
  SELECT 1 FROM notification_preferences np WHERE np.user_id = profiles.id
);

-- Step 3: Create user_state table to replace notification_counts
CREATE TABLE user_state (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  unread_notification_count INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Drop old tables
DROP TABLE IF EXISTS notification_counts CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;  
DROP TABLE IF EXISTS seen_resources CASCADE;

-- Step 5: Update database functions

-- Replace update_notification_counts with update_notification_count
DROP FUNCTION IF EXISTS update_notification_counts(UUID, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION update_notification_count(
  p_user_id UUID,
  p_delta INTEGER
) RETURNS VOID AS $$
BEGIN
  -- Upsert user_state record
  INSERT INTO user_state (user_id, unread_notification_count)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Update count
  UPDATE user_state
  SET unread_notification_count = GREATEST(0, unread_notification_count + p_delta),
      updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update should_send_notification function to read from profiles
CREATE OR REPLACE FUNCTION should_send_notification(p_user_id UUID, p_type TEXT)
RETURNS BOOLEAN AS $$
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
  
  -- Check specific preference based on type
  CASE p_type
    -- Existing types
    WHEN 'comment' THEN
      RETURN COALESCE((preferences->>'comments_on_resources')::boolean, true);
    WHEN 'comment_reply' THEN
      RETURN COALESCE((preferences->>'comment_replies')::boolean, true);
    WHEN 'claim' THEN
      RETURN COALESCE((preferences->>'resource_claims')::boolean, true);
    WHEN 'direct_message' THEN
      RETURN COALESCE((preferences->>'direct_messages')::boolean, true);
    WHEN 'community_message' THEN
      RETURN COALESCE((preferences->>'community_messages')::boolean, true);
    WHEN 'new_resource' THEN
      RETURN COALESCE((preferences->>'community_resources')::boolean, true);
    -- New Social Interactions
    WHEN 'shoutout_received' THEN
      RETURN COALESCE((preferences->>'shoutout_received')::boolean, true);
    WHEN 'connection_request' THEN
      RETURN COALESCE((preferences->>'connection_request')::boolean, true);
    WHEN 'connection_accepted' THEN
      RETURN COALESCE((preferences->>'connection_accepted')::boolean, true);
    -- New My Resources
    WHEN 'resource_claim_cancelled' THEN
      RETURN COALESCE((preferences->>'resource_claim_cancelled')::boolean, true);
    WHEN 'resource_claim_completed' THEN
      RETURN COALESCE((preferences->>'resource_claim_completed')::boolean, true);
    -- New My Registrations
    WHEN 'claim_approved' THEN
      RETURN COALESCE((preferences->>'claim_approved')::boolean, true);
    WHEN 'claim_rejected' THEN
      RETURN COALESCE((preferences->>'claim_rejected')::boolean, true);
    WHEN 'claimed_resource_updated' THEN
      RETURN COALESCE((preferences->>'claimed_resource_updated')::boolean, true);
    WHEN 'claimed_resource_cancelled' THEN
      RETURN COALESCE((preferences->>'claimed_resource_cancelled')::boolean, true);
    -- New My Communities
    WHEN 'community_member_joined' THEN
      RETURN COALESCE((preferences->>'community_member_joined')::boolean, true);
    WHEN 'community_member_left' THEN
      RETURN COALESCE((preferences->>'community_member_left')::boolean, true);
    -- New Community Activity
    WHEN 'new_event' THEN
      RETURN COALESCE((preferences->>'new_event')::boolean, true);
    -- New Trust & Recognition
    WHEN 'trust_points_received' THEN
      RETURN COALESCE((preferences->>'trust_points_received')::boolean, true);
    WHEN 'trust_level_changed' THEN
      RETURN COALESCE((preferences->>'trust_level_changed')::boolean, true);
    ELSE
      RETURN TRUE; -- Default to true for unknown types
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate create_or_update_notification function to use simplified count
DROP FUNCTION IF EXISTS create_or_update_notification(UUID, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID, UUID, UUID, UUID, JSONB);

CREATE OR REPLACE FUNCTION create_or_update_notification(
  p_user_id UUID,
  p_type TEXT,
  p_actor_id UUID,
  p_group_key TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_comment_id UUID DEFAULT NULL,
  p_claim_id UUID DEFAULT NULL,
  p_message_id UUID DEFAULT NULL,
  p_conversation_id UUID DEFAULT NULL,
  p_community_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  existing_notification notifications%ROWTYPE;
  notification_id UUID;
  should_notify BOOLEAN;
BEGIN
  -- Check if user wants this type of notification
  should_notify := should_send_notification(p_user_id, p_type);
  
  IF NOT should_notify THEN
    RETURN NULL; -- Don't create notification
  END IF;
  
  -- Try to find existing notification with same group_key for this user
  IF p_group_key IS NOT NULL THEN
    SELECT * INTO existing_notification
    FROM notifications
    WHERE user_id = p_user_id 
      AND group_key = p_group_key 
      AND is_read = FALSE
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;
  
  IF FOUND THEN
    -- Update existing notification with new actor count and latest info
    UPDATE notifications
    SET 
      actor_count = COALESCE(actor_count, 1) + 1,
      actor_id = p_actor_id, -- Update to latest actor
      title = p_title, -- Update title to reflect new count
      body = COALESCE(p_body, body),
      action_url = COALESCE(p_action_url, action_url),
      metadata = COALESCE(p_metadata, metadata),
      updated_at = NOW()
    WHERE id = existing_notification.id;
    
    RETURN existing_notification.id;
  ELSE
    -- Create new notification
    INSERT INTO notifications (
      user_id, type, actor_id, group_key, title, body, action_url,
      resource_id, comment_id, claim_id, message_id, conversation_id, community_id,
      metadata, created_at, updated_at
    )
    VALUES (
      p_user_id, p_type, p_actor_id, p_group_key, p_title, p_body, p_action_url,
      p_resource_id, p_comment_id, p_claim_id, p_message_id, p_conversation_id, p_community_id,
      p_metadata, NOW(), NOW()
    )
    RETURNING id INTO notification_id;
    
    -- Update notification count
    PERFORM update_notification_count(p_user_id, 1);
    
    RETURN notification_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
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
  
  -- Create default user state
  INSERT INTO public.user_state (
    user_id,
    unread_notification_count,
    last_activity_at,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    0,
    COALESCE(NEW.created_at, now()),
    COALESCE(NEW.created_at, now()),
    now()
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RAISE LOG 'Successfully created default user state for user: %', NEW.id;
  
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
$function$;

-- Add RLS policies for user_state table
ALTER TABLE user_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own state"
ON user_state FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own state"
ON user_state FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Service role can manage user state"
ON user_state FOR ALL
TO service_role
WITH CHECK (true);

-- Add updated_at trigger for user_state (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_user_state_updated_at') THEN
    CREATE TRIGGER handle_user_state_updated_at
        BEFORE UPDATE ON user_state
        FOR EACH ROW
        EXECUTE FUNCTION handle_updated_at();
  END IF;
END $$;

-- Update all existing notification trigger functions to use new update_notification_count function

-- Update notification triggers to use simplified count function
CREATE OR REPLACE FUNCTION notify_on_comment() RETURNS TRIGGER AS $$
DECLARE
  resource_owner_id UUID;
  commenter_name TEXT;
  resource_title TEXT;
  parent_comment_author_id UUID;
  parent_commenter_name TEXT;
BEGIN
  -- Get commenter name with fallback
  SELECT COALESCE(full_name, first_name || ' ' || last_name, 'Someone') INTO commenter_name
  FROM public_profiles
  WHERE id = NEW.author_id;
  
  -- Fallback if no profile found
  IF commenter_name IS NULL THEN
    commenter_name := 'Someone';
  END IF;
  
  -- Handle resource comments
  IF NEW.resource_id IS NOT NULL THEN
    -- Get resource owner and title
    SELECT owner_id, title INTO resource_owner_id, resource_title
    FROM resources
    WHERE id = NEW.resource_id;
    
    -- Notify resource owner if they're not the commenter
    IF resource_owner_id != NEW.author_id THEN
      PERFORM create_or_update_notification(
        resource_owner_id,
        'comment',
        NEW.author_id,
        'comment:' || NEW.resource_id::text,
        commenter_name || ' commented on ' || LOWER(resource_title),
        NEW.content,
        '/resources/' || NEW.resource_id::text,
        NEW.resource_id,
        NEW.id,
        NULL, NULL, NULL, NULL,
        jsonb_build_object('resource_title', resource_title)
      );
    END IF;
  END IF;
  
  -- Handle comment replies
  IF NEW.parent_id IS NOT NULL THEN
    -- Get parent comment author
    SELECT author_id INTO parent_comment_author_id
    FROM comments
    WHERE id = NEW.parent_id;
    
    -- Only notify if parent author is different from the new commenter and resource owner
    IF parent_comment_author_id != NEW.author_id AND parent_comment_author_id != resource_owner_id THEN
      -- Get parent commenter name
      SELECT COALESCE(full_name, first_name || ' ' || last_name, 'Someone') INTO parent_commenter_name
      FROM public_profiles
      WHERE id = parent_comment_author_id;
      
      PERFORM create_or_update_notification(
        parent_comment_author_id,
        'comment_reply',
        NEW.author_id,
        'reply:' || NEW.parent_id::text,
        commenter_name || ' replied to your comment',
        NEW.content,
        '/resources/' || NEW.resource_id::text,
        NEW.resource_id,
        NEW.id,
        NULL, NULL, NULL, NULL,
        jsonb_build_object('resource_title', resource_title, 'parent_comment_id', NEW.parent_id)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make sure trigger exists
DROP TRIGGER IF EXISTS comment_notification_trigger ON comments;
CREATE TRIGGER comment_notification_trigger
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION notify_on_comment();

-- Update update_counts_on_read function to use new update_notification_count function
CREATE OR REPLACE FUNCTION update_counts_on_read() RETURNS TRIGGER AS $$
BEGIN
  -- Only update counts if the notification was marked as read
  IF OLD.is_read = FALSE AND NEW.is_read = TRUE THEN
    PERFORM update_notification_count(OLD.user_id, -1);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;