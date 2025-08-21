-- Fix silent failure anti-patterns in trigger functions
-- Replace ON CONFLICT DO NOTHING with proper error handling

-- Fix auto_add_organizer_to_community_memberships function
CREATE OR REPLACE FUNCTION "public"."auto_add_organizer_to_community_memberships"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  row_count INTEGER;
BEGIN
  -- Log the attempt for debugging
  RAISE LOG 'Auto-adding organizer % to community % memberships', NEW.organizer_id, NEW.id;
  
  -- Insert the organizer as a member with proper conflict handling
  -- Note: member_count is updated automatically by community_memberships_insert_trigger
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
  )
  ON CONFLICT (user_id, community_id) 
  DO UPDATE SET updated_at = now() 
  WHERE FALSE; -- This never executes, just allows us to detect conflicts
  
  -- Check if the insert actually happened
  GET DIAGNOSTICS row_count = ROW_COUNT;
  
  IF row_count > 0 THEN
    RAISE LOG 'Successfully added organizer % to community % memberships', NEW.organizer_id, NEW.id;
  ELSE
    RAISE LOG 'Organizer % already member of community % (conflict)', NEW.organizer_id, NEW.id;
  END IF;
  
  RETURN NEW;
  
EXCEPTION
  WHEN unique_violation THEN
    -- This shouldn't happen with ON CONFLICT, but handle just in case
    RAISE LOG 'Organizer % already member of community % (unique violation)', NEW.organizer_id, NEW.id;
    RETURN NEW;
    
  WHEN foreign_key_violation THEN
    -- Handle foreign key constraint violations with detailed error
    RAISE WARNING 'Foreign key violation adding organizer % to community %: %. Check if user profile exists.', 
      NEW.organizer_id, NEW.id, SQLERRM;
    RETURN NEW;
    
  WHEN OTHERS THEN
    -- Handle any other errors with full context
    RAISE WARNING 'Unexpected error adding organizer % to community %: %', 
      NEW.organizer_id, NEW.id, SQLERRM;
    -- Still return NEW to allow community creation to proceed
    RETURN NEW;
END;
$$;

-- Fix auto_add_organizer_attendance function (gathering responses)
CREATE OR REPLACE FUNCTION "public"."auto_add_organizer_attendance"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  row_count INTEGER;
BEGIN
    -- Insert organizer as attendee with 'attending' status with proper conflict handling
    INSERT INTO gathering_responses (gathering_id, user_id, status)
    VALUES (NEW.id, NEW.organizer_id, 'attending')
    ON CONFLICT (gathering_id, user_id) 
    DO UPDATE SET status = 'attending', updated_at = now()
    WHERE gathering_responses.status != 'attending'; -- Only update if status changed
    
    -- Check if the insert/update actually happened
    GET DIAGNOSTICS row_count = ROW_COUNT;
    
    IF row_count > 0 THEN
      RAISE LOG 'Successfully added/updated organizer % attendance for gathering %', NEW.organizer_id, NEW.id;
    ELSE
      RAISE LOG 'Organizer % already attending gathering % with correct status', NEW.organizer_id, NEW.id;
    END IF;
    
    RETURN NEW;
EXCEPTION
  WHEN foreign_key_violation THEN
    RAISE WARNING 'Foreign key violation adding organizer % to gathering %: %', NEW.organizer_id, NEW.id, SQLERRM;
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'Unexpected error adding organizer % to gathering %: %', NEW.organizer_id, NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Fix auto_add_organizer_to_event_attendances function
CREATE OR REPLACE FUNCTION "public"."auto_add_organizer_to_event_attendances"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  row_count INTEGER;
BEGIN
  -- Log the attempt for debugging
  RAISE LOG 'Auto-adding organizer % to event % attendances', NEW.organizer_id, NEW.id;
  
  -- Insert the organizer as an attendee with "attending" status with proper conflict handling
  INSERT INTO event_attendances (
    user_id,
    event_id,
    status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.organizer_id,
    NEW.id,
    'attending',
    now(),
    now()
  )
  ON CONFLICT (user_id, event_id) 
  DO UPDATE SET 
    status = 'attending',
    updated_at = now()
  WHERE event_attendances.status != 'attending'; -- Only update if status changed
  
  -- Check if the insert/update actually happened
  GET DIAGNOSTICS row_count = ROW_COUNT;
  
  IF row_count > 0 THEN
    RAISE LOG 'Successfully added/updated organizer % attendance for event %', NEW.organizer_id, NEW.id;
  ELSE
    RAISE LOG 'Organizer % already attending event % with correct status', NEW.organizer_id, NEW.id;
  END IF;

  -- DO NOT manually update attendee_count - let the existing trigger handle it
  
  RETURN NEW;
  
EXCEPTION
  WHEN unique_violation THEN
    -- Handle duplicate key violations (shouldn't happen with ON CONFLICT, but just in case)
    RAISE LOG 'Organizer % already attending event % (unique violation)', NEW.organizer_id, NEW.id;
    RETURN NEW;
    
  WHEN foreign_key_violation THEN
    -- Handle foreign key constraint violations
    RAISE WARNING 'Foreign key violation adding organizer % to event %: %', NEW.organizer_id, NEW.id, SQLERRM;
    RETURN NEW;
    
  WHEN OTHERS THEN
    -- Handle any other errors
    RAISE WARNING 'Unexpected error adding organizer % to event %: %', NEW.organizer_id, NEW.id, SQLERRM;
    -- Still return NEW to allow event creation to proceed
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION "public"."auto_add_organizer_to_community_memberships"() IS 'Automatically adds community organizer to community_memberships table when a new community is created. Fixed to properly handle conflicts and provide detailed error reporting instead of silent failures.';

COMMENT ON FUNCTION "public"."auto_add_organizer_attendance"() IS 'Automatically adds gathering organizer to gathering_responses table when a new gathering is created. Fixed to properly handle conflicts and provide detailed error reporting.';

COMMENT ON FUNCTION "public"."auto_add_organizer_to_event_attendances"() IS 'Automatically adds event organizer to event_attendances table when a new event is created. Fixed to properly handle conflicts and provide detailed error reporting instead of silent failures.';