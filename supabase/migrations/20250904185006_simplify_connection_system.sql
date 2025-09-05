-- Simplify Connection System Migration
-- Replace complex connection_requests system with direct connections via user_connections table

-- ============================================================================
-- STEP 1: DROP CONNECTION_REQUESTS DEPENDENCIES
-- ============================================================================

-- Drop triggers that depend on connection_requests
DROP TRIGGER IF EXISTS connection_request_notification_trigger ON connection_requests;
DROP TRIGGER IF EXISTS connection_acceptance_notification_trigger ON connection_requests;

-- Drop functions that depend on connection_requests
DROP FUNCTION IF EXISTS notify_on_connection_request();
DROP FUNCTION IF EXISTS notify_on_connection_accepted();
DROP FUNCTION IF EXISTS create_user_connection(uuid);
DROP FUNCTION IF EXISTS cleanup_expired_connection_requests();
DROP FUNCTION IF EXISTS notify_connection_request(UUID, UUID);

-- ============================================================================
-- STEP 2: UPDATE USER_CONNECTIONS TABLE STRUCTURE
-- ============================================================================

-- Remove foreign key constraint to connection_requests
ALTER TABLE user_connections DROP CONSTRAINT IF EXISTS user_connections_connection_request_id_fkey;

-- Remove the connection_request_id column
ALTER TABLE user_connections DROP COLUMN IF EXISTS connection_request_id;

-- Add type column with constraint (only 'invited_by' for now)
ALTER TABLE user_connections ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'invited_by';
ALTER TABLE user_connections DROP CONSTRAINT IF EXISTS user_connections_type_check;
ALTER TABLE user_connections ADD CONSTRAINT user_connections_type_check CHECK (type = 'invited_by');

-- Rename columns to be more intuitive
ALTER TABLE user_connections RENAME COLUMN user_a_id TO user_id;
ALTER TABLE user_connections RENAME COLUMN user_b_id TO other_id;

-- Update foreign key constraints with new column names
ALTER TABLE user_connections DROP CONSTRAINT IF EXISTS user_connections_user_a_id_fkey;
ALTER TABLE user_connections DROP CONSTRAINT IF EXISTS user_connections_user_b_id_fkey;
ALTER TABLE user_connections ADD CONSTRAINT user_connections_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE user_connections ADD CONSTRAINT user_connections_other_id_fkey 
  FOREIGN KEY (other_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Update unique constraint with new column names
ALTER TABLE user_connections DROP CONSTRAINT IF EXISTS unique_user_connection;
ALTER TABLE user_connections ADD CONSTRAINT unique_user_connection 
  UNIQUE (community_id, user_id, other_id);

-- ============================================================================
-- STEP 3: UPDATE RLS POLICIES
-- ============================================================================

-- Update RLS policies for user_connections with new column names
DROP POLICY IF EXISTS "Users can view their connections" ON user_connections;
CREATE POLICY "Users can view their connections" ON user_connections
  FOR SELECT USING ((auth.uid() = user_id) OR (auth.uid() = other_id));

DROP POLICY IF EXISTS "System can create connections" ON user_connections;
CREATE POLICY "Users can create connections" ON user_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() = other_id);

-- ============================================================================
-- STEP 4: CREATE NEW DIRECT CONNECTION FUNCTIONS
-- ============================================================================

-- Function to create direct user connections (replaces connection request flow)
CREATE OR REPLACE FUNCTION create_direct_user_connection(
  p_user_id UUID,
  p_other_id UUID,
  p_community_id UUID
) RETURNS UUID AS $$
DECLARE
  connection_id UUID;
BEGIN
  -- Create the connection record
  INSERT INTO user_connections (
    user_id,
    other_id,
    community_id,
    type
  ) VALUES (
    p_user_id,
    p_other_id,
    p_community_id,
    'invited_by'
  ) 
  ON CONFLICT (community_id, user_id, other_id) DO NOTHING
  RETURNING id INTO connection_id;
    
  RETURN connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- No need for a separate notify_connection_created function
-- We'll use the existing notify_connection_accepted function instead

-- ============================================================================
-- STEP 5: UPDATE handle_new_user FUNCTION
-- ============================================================================

-- Update handle_new_user function to create direct connections instead of requests
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_email text;
  user_meta jsonb;
  invitation_code text;
  member_code_record RECORD;
  connection_id UUID;
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
  
  -- Create default user state if table exists
  BEGIN
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
  EXCEPTION
    WHEN undefined_table THEN
      -- user_state table doesn't exist yet, skip
      NULL;
  END;
  
  -- Process invitation code if present
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
      
      -- Create direct connection with the invitation originator
      SELECT create_direct_user_connection(
        NEW.id,
        member_code_record.created_by,
        member_code_record.community_id
      ) INTO connection_id;
      
      IF connection_id IS NOT NULL THEN
        -- Notify the new user that their connection was accepted
        PERFORM notify_connection_accepted(NEW.id, member_code_record.created_by);
        
        RAISE LOG 'Created direct connection for user % with originator %', NEW.id, member_code_record.created_by;
      END IF;
    ELSE
      RAISE LOG 'Invalid or expired invitation code: %', invitation_code;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RAISE WARNING 'User profile already exists for user %', NEW.id;
    RETURN NEW;
    
  WHEN foreign_key_violation THEN
    RAISE WARNING 'Foreign key violation creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
    
  WHEN check_violation THEN
    RAISE WARNING 'Check constraint violation creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
    
  WHEN not_null_violation THEN
    RAISE WARNING 'Not null violation creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
    
  WHEN OTHERS THEN
    RAISE WARNING 'Unexpected error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 6: CLEAN UP CONNECTION_REQUESTS TABLE AND RELATED OBJECTS
-- ============================================================================

-- Drop the connection_requests table and all its dependencies
DROP TABLE IF EXISTS connection_requests CASCADE;
DROP TYPE IF EXISTS connection_request_status;

-- ============================================================================
-- STEP 7: UPDATE NOTIFICATION SYSTEM
-- ============================================================================

-- Remove connection_request notification type from constraint (keep connection_accepted)
-- First, clean up any notifications with invalid types, especially connection_request
DELETE FROM notifications WHERE type = 'connection_request';
DELETE FROM notifications WHERE type NOT IN (
    'comment', 'comment_reply', 'claim', 'direct_message', 'community_message', 'new_resource',
    'shoutout_received', 'connection_accepted',
    'resource_claim_cancelled', 'resource_claim_completed',
    'claim_approved', 'claim_rejected', 'claimed_resource_updated', 'claimed_resource_cancelled',
    'community_member_joined', 'community_member_left',
    'new_event',
    'trust_points_received', 'trust_level_changed'
);

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN (
    -- Existing types (4 + 2 message types)
    'comment', 'comment_reply', 'claim', 'direct_message', 'community_message', 'new_resource',
    -- Social Interactions types (2 - removed connection_request)
    'shoutout_received', 'connection_accepted',
    -- My Resources types (2) 
    'resource_claim_cancelled', 'resource_claim_completed',
    -- My Registrations types (4)
    'claim_approved', 'claim_rejected', 'claimed_resource_updated', 'claimed_resource_cancelled',
    -- My Communities types (2)
    'community_member_joined', 'community_member_left',
    -- Community Activity types (1)
    'new_event',
    -- Trust & Recognition types (2)
    'trust_points_received', 'trust_level_changed'
  ));

-- notification_preferences table no longer exists - preferences moved to profiles table

-- Update should_send_notification function to remove connection_request handling
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 8: GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions on new functions
GRANT EXECUTE ON FUNCTION create_direct_user_connection TO authenticated, service_role;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION create_direct_user_connection IS 'Creates user connection for invited_by type';
