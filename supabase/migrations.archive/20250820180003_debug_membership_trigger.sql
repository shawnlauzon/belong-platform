-- Temporary migration to add more detailed logging to the membership trigger
-- This will help us understand why the trigger is still failing

CREATE OR REPLACE FUNCTION "public"."auto_add_organizer_to_community_memberships"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  row_count INTEGER;
  profile_exists BOOLEAN := FALSE;
  user_exists BOOLEAN := FALSE;
BEGIN
  -- Enhanced logging for debugging
  RAISE LOG 'DEBUG: Auto-adding organizer % to community % memberships', NEW.organizer_id, NEW.id;
  
  -- Check if the user exists in auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = NEW.organizer_id) INTO user_exists;
  RAISE LOG 'DEBUG: User % exists in auth.users: %', NEW.organizer_id, user_exists;
  
  -- Check if the user has a profile
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = NEW.organizer_id) INTO profile_exists;
  RAISE LOG 'DEBUG: Profile exists for user %: %', NEW.organizer_id, profile_exists;
  
  -- Check if membership already exists
  PERFORM 1 FROM community_memberships 
  WHERE user_id = NEW.organizer_id AND community_id = NEW.id;
  
  IF FOUND THEN
    RAISE LOG 'DEBUG: Membership already exists for user % in community %', NEW.organizer_id, NEW.id;
    RETURN NEW;
  END IF;
  
  -- Try the insert with detailed error info
  RAISE LOG 'DEBUG: Attempting to insert membership for user % in community %', NEW.organizer_id, NEW.id;
  
  INSERT INTO community_memberships (
    user_id,
    community_id,
    created_at,
    updated_at
  )
  VALUES (
    NEW.organizer_id,
    NEW.id,
    now(),
    now()
  );
  
  -- Check if the insert succeeded
  GET DIAGNOSTICS row_count = ROW_COUNT;
  RAISE LOG 'DEBUG: Insert result - rows affected: %', row_count;
  
  IF row_count > 0 THEN
    RAISE LOG 'SUCCESS: Added organizer % to community % memberships', NEW.organizer_id, NEW.id;
  ELSE
    RAISE WARNING 'FAILED: No rows inserted for organizer % in community %', NEW.organizer_id, NEW.id;
  END IF;
  
  RETURN NEW;
  
EXCEPTION
  WHEN unique_violation THEN
    RAISE LOG 'DEBUG: Unique violation - organizer % already member of community %', NEW.organizer_id, NEW.id;
    RETURN NEW;
    
  WHEN foreign_key_violation THEN
    RAISE WARNING 'DEBUG: Foreign key violation for organizer % in community %: %. User exists: %, Profile exists: %', 
      NEW.organizer_id, NEW.id, SQLERRM, user_exists, profile_exists;
    RETURN NEW;
    
  WHEN OTHERS THEN
    RAISE WARNING 'DEBUG: Unexpected error for organizer % in community %: %. SQLSTATE: %', 
      NEW.organizer_id, NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;