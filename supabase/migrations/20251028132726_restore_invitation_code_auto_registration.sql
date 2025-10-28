-- Restore invitation code auto-registration functionality to handle_new_user
-- This was removed by the push notification redesign migration

-- Add mapping for connection.accepted action
INSERT INTO action_to_notification_type_mapping (action, notification_type)
VALUES ('connection.accepted', 'connection.accepted')
ON CONFLICT (action) DO NOTHING;

-- Add connection_accepted preference column
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS connection_accepted JSONB NOT NULL DEFAULT '{"in_app": true, "push": true, "email": false}'::jsonb;

-- Create notify_connection_accepted function
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
    p_action := 'connection.accepted',
    p_actor_id := p_actor_id
  );
END;
$$;

-- Restore handle_new_user with invitation code processing
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
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

  -- Insert the profile
  INSERT INTO public.profiles (
    id,
    email,
    user_metadata,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    user_email,
    user_meta,
    COALESCE(NEW.created_at, now()),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    user_metadata = EXCLUDED.user_metadata,
    updated_at = now();

  -- Create default notification preferences
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RAISE LOG 'Successfully created/updated profile and preferences for user: %', NEW.id;

  -- Process invitation code if present
  invitation_code := user_meta ->> 'invitation_code';

  IF invitation_code IS NOT NULL AND invitation_code != '' THEN
    RAISE LOG 'Processing invitation code: % for user: %', invitation_code, NEW.id;

    -- Find the invitation code to get community info
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

      -- Create platform-level connection
      SELECT create_user_connection(
        member_code_record.user_id,  -- Inviter
        NEW.id                        -- Invitee
      ) INTO connection_id;

      IF connection_id IS NOT NULL THEN
        -- Notify the new user
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
