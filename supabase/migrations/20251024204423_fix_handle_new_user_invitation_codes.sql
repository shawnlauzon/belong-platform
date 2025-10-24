-- Fix handle_new_user to use correct table name (invitation_codes)
-- The October 24 migration accidentally used the old table name community_member_codes

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

    -- Find the invitation code to get community info
    -- FIXED: Use invitation_codes table instead of community_member_codes
    SELECT ic.*, c.id as community_id, c.name as community_name
    INTO member_code_record
    FROM invitation_codes ic
    JOIN communities c ON c.id = ic.community_id
    WHERE ic.code = invitation_code
      AND ic.is_active = true;

    IF FOUND THEN
      RAISE LOG 'Found active invitation code: % for community: %', invitation_code, member_code_record.community_name;

      -- Auto-join the community
      INSERT INTO community_memberships (community_id, user_id, created_at, updated_at)
      VALUES (member_code_record.community_id, NEW.id, now(), now())
      ON CONFLICT (community_id, user_id) DO NOTHING;

      RAISE LOG 'User % automatically joined community: %', NEW.id, member_code_record.community_name;

      -- Create platform-level connection with inviter as user_id, invitee as other_id
      -- FIXED: Use user_id instead of created_by
      SELECT create_user_connection(
        member_code_record.user_id,  -- Inviter (becomes user_id)
        NEW.id                        -- Invitee (becomes other_id)
      ) INTO connection_id;

      IF connection_id IS NOT NULL THEN
        -- Notify the new user that their connection was accepted
        PERFORM notify_connection_accepted(NEW.id, member_code_record.user_id);

        RAISE LOG 'Created platform-level connection for inviter % with invitee %', member_code_record.user_id, NEW.id;
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
$$;

-- Fix notify_connection_accepted to use correct enum value
CREATE OR REPLACE FUNCTION notify_connection_accepted(
  p_user_id UUID,
  p_actor_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN create_notification_base(
    p_user_id := p_user_id,
    p_type := 'connection.accepted',
    p_actor_id := p_actor_id
  );
END;
$$;
