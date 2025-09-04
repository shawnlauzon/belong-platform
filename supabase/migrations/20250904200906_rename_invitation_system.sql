-- Rename Invitation System Migration
-- Rename connection-related functions and tables to use invitation terminology
-- Keep user_connections table as it represents actual relationships

-- ============================================================================
-- STEP 1: RENAME TABLES
-- ============================================================================

-- Rename community_member_codes to invitation_codes
ALTER TABLE community_member_codes RENAME TO invitation_codes;

-- Update any indexes or constraints that reference the old table name
ALTER INDEX IF EXISTS community_member_codes_pkey RENAME TO invitation_codes_pkey;
ALTER INDEX IF EXISTS community_member_codes_code_key RENAME TO invitation_codes_code_key;
ALTER INDEX IF EXISTS idx_community_member_codes_user_community RENAME TO idx_invitation_codes_user_community;

-- ============================================================================
-- STEP 2: RENAME DATABASE FUNCTIONS
-- ============================================================================

-- Rename create_direct_user_connection to create_user_connection
DROP FUNCTION IF EXISTS create_user_connection(uuid, uuid, uuid);
CREATE OR REPLACE FUNCTION create_user_connection(
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

-- Drop old function
DROP FUNCTION IF EXISTS create_direct_user_connection(uuid, uuid, uuid);

-- Rename generate_member_connection_code to generate_invitation_code
CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  max_attempts INTEGER := 10;
  attempt_count INTEGER := 0;
  existing_code RECORD;
BEGIN
  -- Only for INSERT operations on community_memberships
  IF TG_OP != 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- Check if user already has an active invitation code for this community
  SELECT * INTO existing_code
  FROM invitation_codes 
  WHERE user_id = NEW.user_id 
    AND community_id = NEW.community_id 
    AND is_active = true;
  
  -- If user already has an active code, don't create another one
  IF FOUND THEN
    RETURN NEW;
  END IF;
  
  -- Generate unique code with retry logic
  LOOP
    -- Generate 8-character uppercase code matching JavaScript implementation
    -- Use same character set: '23456789ABCDEFGHJKLMNPQRSTUVWXYZ' (excludes 0,1,I,O)
    new_code := '';
    FOR i IN 1..8 LOOP
      new_code := new_code || substring('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 
        floor(random() * 32)::integer + 1, 1);
    END LOOP;
    
    -- Try to insert the code
    BEGIN
      INSERT INTO invitation_codes (code, user_id, community_id)
      VALUES (new_code, NEW.user_id, NEW.community_id);
      EXIT; -- Success, exit loop
    EXCEPTION WHEN unique_violation THEN
      -- Code already exists, try again
      attempt_count := attempt_count + 1;
      IF attempt_count >= max_attempts THEN
        RAISE EXCEPTION 'Failed to generate unique invitation code after % attempts', max_attempts;
      END IF;
    END;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the old trigger first, then the function
DROP TRIGGER IF EXISTS trigger_generate_member_connection_code ON community_memberships;
DROP FUNCTION IF EXISTS generate_member_connection_code();

-- Rename regenerate_member_connection_code to regenerate_invitation_code  
CREATE OR REPLACE FUNCTION regenerate_invitation_code(
  p_user_id UUID,
  p_community_id UUID
) RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  max_attempts INTEGER := 10;
  attempt_count INTEGER := 0;
  old_code_record RECORD;
BEGIN
  -- First, deactivate existing code
  UPDATE invitation_codes
  SET is_active = false
  WHERE user_id = p_user_id AND community_id = p_community_id AND is_active = true
  RETURNING code INTO old_code_record;
  
  -- Generate new unique code with retry logic
  LOOP
    -- Generate 8-character uppercase code matching JavaScript implementation
    -- Use same character set: '23456789ABCDEFGHJKLMNPQRSTUVWXYZ' (excludes 0,1,I,O)
    new_code := '';
    FOR i IN 1..8 LOOP
      new_code := new_code || substring('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 
        floor(random() * 32)::integer + 1, 1);
    END LOOP;
    
    -- Try to insert the new code
    BEGIN
      INSERT INTO invitation_codes (code, user_id, community_id, is_active)
      VALUES (new_code, p_user_id, p_community_id, true);
      EXIT; -- Success, exit loop
    EXCEPTION WHEN unique_violation THEN
      -- Code already exists, try again
      attempt_count := attempt_count + 1;
      IF attempt_count >= max_attempts THEN
        RAISE EXCEPTION 'Failed to generate unique invitation code after % attempts', max_attempts;
      END IF;
    END;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old function
DROP FUNCTION IF EXISTS regenerate_member_connection_code(uuid, uuid);

-- Rename get_connection_details to get_invitation_details
CREATE OR REPLACE FUNCTION get_invitation_details(connection_code TEXT)
RETURNS TABLE(
  user_id UUID,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  avatar_url TEXT,
  community_id UUID,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pp.id as user_id,
    pp.first_name,
    pp.last_name,
    pp.full_name,
    pp.avatar_url,
    ic.community_id,
    ic.is_active,
    ic.created_at
  FROM public_profiles pp
  INNER JOIN invitation_codes ic ON pp.id = ic.user_id
  WHERE ic.code = connection_code
    AND ic.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old function
DROP FUNCTION IF EXISTS get_connection_details(text);

-- ============================================================================
-- STEP 3: UPDATE TRIGGERS
-- ============================================================================

-- Update the trigger to use new function name
DROP TRIGGER IF EXISTS generate_member_connection_code_trigger ON community_memberships;
CREATE TRIGGER generate_invitation_code_trigger
  AFTER INSERT ON community_memberships
  FOR EACH ROW EXECUTE FUNCTION generate_invitation_code();

-- ============================================================================
-- STEP 4: UPDATE HANDLE_NEW_USER FUNCTION
-- ============================================================================

-- Update handle_new_user function to reference new table and function names
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_email text;
  user_meta jsonb;
  invitation_code text;
  invitation_record RECORD;
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
    
    -- Find the invitation code to get community info
    SELECT ic.*, c.id as community_id, c.name as community_name
    INTO invitation_record
    FROM invitation_codes ic
    JOIN communities c ON c.id = ic.community_id
    WHERE ic.code = invitation_code
      AND ic.is_active = true;
    
    IF FOUND THEN
      RAISE LOG 'Found active invitation code: % for community: %', invitation_code, invitation_record.community_name;
      
      -- Auto-join the community
      INSERT INTO community_memberships (community_id, user_id, created_at, updated_at)
      VALUES (invitation_record.community_id, NEW.id, now(), now())
      ON CONFLICT (community_id, user_id) DO NOTHING;
      
      RAISE LOG 'User % automatically joined community: %', NEW.id, invitation_record.community_name;
      
      -- Create direct connection with the invitation originator
      -- Fixed: Use user_id instead of created_by (which doesn't exist in invitation_codes table)
      SELECT create_user_connection(
        NEW.id,
        invitation_record.user_id,  -- This is the person who created the invitation code
        invitation_record.community_id
      ) INTO connection_id;
      
      IF connection_id IS NOT NULL THEN
        -- Notify the new user that their connection was accepted
        PERFORM notify_connection_accepted(NEW.id, invitation_record.user_id);
        
        RAISE LOG 'Created direct connection for user % with originator %', NEW.id, invitation_record.user_id;
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
-- STEP 5: GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions on new functions
GRANT EXECUTE ON FUNCTION create_user_connection TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION generate_invitation_code TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION regenerate_invitation_code TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_invitation_details TO authenticated, service_role;

-- ============================================================================
-- STEP 6: DROP OBSOLETE CONSTRAINTS
-- ============================================================================

-- Drop the ordered_user_ids constraint as it's no longer needed for the simplified system
ALTER TABLE user_connections DROP CONSTRAINT IF EXISTS ordered_user_ids;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE invitation_codes IS 'Codes that users can share to invite others to connect within a community';
COMMENT ON FUNCTION create_user_connection IS 'Creates a user connection for invited_by type';
COMMENT ON FUNCTION generate_invitation_code IS 'Generates unique invitation codes when users join communities';
COMMENT ON FUNCTION regenerate_invitation_code IS 'Regenerates a user''s invitation code for a community';
COMMENT ON FUNCTION get_invitation_details IS 'Gets user details for a given invitation code';