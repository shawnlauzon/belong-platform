-- Update handle_new_user trigger to create default notification preferences for new users
-- This ensures every new user has notification preferences from signup

-- First, add the missing group-level notification columns to the notification_preferences table
ALTER TABLE public.notification_preferences 
ADD COLUMN IF NOT EXISTS social_interactions boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS my_resources boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS my_registrations boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS my_communities boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS community_activity boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS trust_recognition boolean DEFAULT true;

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
  
  -- Insert the profile with error handling
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
  
  RAISE LOG 'Successfully created profile for user: %', NEW.id;
  
  -- Create default notification preferences for the new user using group-level toggles
  INSERT INTO public.notification_preferences (
    user_id,
    -- Group-level notification controls (7 groups)
    social_interactions,      -- Controls: comments, replies, shoutouts, connections
    my_resources,            -- Controls: resource claims, cancellations, completions
    my_registrations,        -- Controls: claim approvals, rejections, resource updates/cancellations
    my_communities,          -- Controls: member joins/leaves for communities you organize
    community_activity,      -- Controls: new resources/events in communities you're a member of
    trust_recognition,       -- Controls: trust points and level changes
    -- Messages (granular control as documented)
    direct_messages,         -- Direct 1:1 messages
    community_messages,      -- Community chat messages
    -- Global settings (disabled by default for privacy)
    email_enabled,
    push_enabled,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    -- All notification groups enabled by default (user-friendly)
    true,  -- social_interactions
    true,  -- my_resources
    true,  -- my_registrations
    true,  -- my_communities
    true,  -- community_activity
    true,  -- trust_recognition
    -- Messages enabled by default
    true,  -- direct_messages
    true,  -- community_messages
    -- Global settings disabled for privacy
    false, -- email_enabled
    false, -- push_enabled
    COALESCE(NEW.created_at, now()),
    now()
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RAISE LOG 'Successfully created default notification preferences for user: %', NEW.id;
  
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
        member_code_record.user_id,
        NEW.id,
        'pending',
        now(),
        now() + interval '30 days'
      )
      ON CONFLICT (community_id, initiator_id, requester_id) DO NOTHING;
      
      RAISE LOG 'Connection request created for user: % with invitation originator', NEW.id;
      
    ELSE
      RAISE LOG 'Invalid or inactive invitation code: % for user: %', invitation_code, NEW.id;
    END IF;
    
  ELSE
    RAISE LOG 'No invitation code found for user: %', NEW.id;
  END IF;
  
  RETURN NEW;
  
EXCEPTION
  WHEN unique_violation THEN
    -- Handle duplicate key violations (shouldn't happen with ON CONFLICT, but just in case)
    RAISE LOG 'Profile already exists for user: %', NEW.id;
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
    RAISE WARNING 'Unexpected error processing user signup for %: %', NEW.id, SQLERRM;
    -- Still return NEW to allow user creation to proceed
    RETURN NEW;
END;
$function$;