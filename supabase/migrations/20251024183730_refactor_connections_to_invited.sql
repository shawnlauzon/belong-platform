-- Refactor Connection System: 'invited_by' -> 'invited'
-- Changes semantics from "I was invited by X" to "I invited X"
-- Makes connections platform-level (removes community_id)
-- Enforces system-only creation of 'invited' connections while allowing future types

-- ============================================================================
-- STEP 1: FLIP EXISTING CONNECTIONS
-- ============================================================================
-- Swap user_id and other_id to flip the relationship direction
-- Before: (user_id=invitee, other_id=inviter, type='invited_by')
-- After: (user_id=inviter, other_id=invitee, type='invited')

UPDATE user_connections
SET
  user_id = other_id,
  other_id = user_id;

-- ============================================================================
-- STEP 2: UPDATE ENUM TYPE
-- ============================================================================
-- Rename the enum value from 'invited_by' to 'invited'

ALTER TYPE user_connection_type RENAME VALUE 'invited_by' TO 'invited';

-- Update all existing type values (should all be 'invited_by' currently)
UPDATE user_connections SET type = 'invited';

-- ============================================================================
-- STEP 3: REMOVE COMMUNITY_ID FROM CONNECTIONS
-- ============================================================================
-- Connections are platform-level relationships, not community-specific

-- Drop old unique constraint that included community_id
ALTER TABLE user_connections DROP CONSTRAINT IF EXISTS unique_user_connection;

-- Drop old indexes that included community_id
DROP INDEX IF EXISTS idx_user_connections_community;

-- Remove the community_id column
ALTER TABLE user_connections DROP COLUMN IF EXISTS community_id;

-- Add new unique constraint without community_id
ALTER TABLE user_connections ADD CONSTRAINT unique_user_connection
  UNIQUE (user_id, other_id);

-- ============================================================================
-- STEP 4: UPDATE RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their connections" ON user_connections;
DROP POLICY IF EXISTS "Users can create connections" ON user_connections;
DROP POLICY IF EXISTS "System can create connections" ON user_connections;
DROP POLICY IF EXISTS "Authenticated users can view connections" ON user_connections;
DROP POLICY IF EXISTS "Only system can create invited connections" ON user_connections;
DROP POLICY IF EXISTS "Users can update their connections" ON user_connections;

-- SELECT: All authenticated users can view all connections (transparency)
CREATE POLICY "Authenticated users can view connections" ON user_connections
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: Block direct creation of 'invited' type, allow future connection types
CREATE POLICY "Only system can create invited connections" ON user_connections
  FOR INSERT TO authenticated
  WITH CHECK (type != 'invited');

-- UPDATE: Only the inviter (user_id) can update their connection strength
CREATE POLICY "Users can update their connections" ON user_connections
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- STEP 5: UPDATE CONNECTION CREATION FUNCTION
-- ============================================================================

-- Drop old function signatures
DROP FUNCTION IF EXISTS create_direct_user_connection(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS create_user_connection(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS create_user_connection(UUID, UUID);

-- Create the function without community_id parameter
CREATE OR REPLACE FUNCTION create_user_connection(
  p_inviter_id UUID,    -- Person who created the invitation
  p_invitee_id UUID     -- Person who accepted the invitation
) RETURNS UUID AS $$
DECLARE
  connection_id UUID;
BEGIN
  -- Create the connection record with inviter as user_id
  INSERT INTO user_connections (
    user_id,
    other_id,
    type
  ) VALUES (
    p_inviter_id,
    p_invitee_id,
    'invited'
  )
  ON CONFLICT (user_id, other_id) DO NOTHING
  RETURNING id INTO connection_id;

  RETURN connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_user_connection TO authenticated, service_role;

-- Add comment for documentation
COMMENT ON FUNCTION create_user_connection IS
  'Creates platform-level user connection with inviter as user_id and invitee as other_id. Only callable by system (SECURITY DEFINER).';

-- ============================================================================
-- STEP 6: UPDATE handle_new_user TRIGGER FUNCTION
-- ============================================================================

-- Update the trigger to call the function without community_id
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

      -- Create platform-level connection with inviter as user_id, invitee as other_id
      -- CHANGED: No longer passing community_id
      SELECT create_user_connection(
        member_code_record.created_by,  -- Inviter (becomes user_id)
        NEW.id                          -- Invitee (becomes other_id)
      ) INTO connection_id;

      IF connection_id IS NOT NULL THEN
        -- Notify the new user that their connection was accepted
        PERFORM notify_connection_accepted(NEW.id, member_code_record.created_by);

        RAISE LOG 'Created platform-level connection for inviter % with invitee %', member_code_record.created_by, NEW.id;
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
