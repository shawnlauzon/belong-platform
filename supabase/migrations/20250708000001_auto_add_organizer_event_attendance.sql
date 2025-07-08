/*
  # Auto-add event organizer to event attendances

  1. Problem
    - Event organizers are not automatically marked as attending their own events
    - This creates an inconsistent experience where organizers must manually join
    - Similar to how community organizers become the first member of their communities

  2. Solution
    - Create trigger function to automatically add organizer to event_attendances
    - Set organizer status to "attending" when event is created
    - Use ON CONFLICT DO NOTHING to handle potential race conditions
    - Follow established patterns from community membership triggers

  3. Benefits
    - Ensures organizers are always marked as attending their events
    - Maintains consistency with community membership patterns
    - Reduces manual steps for event organizers
    - Provides better user experience and data integrity
*/

-- Create function to auto-add organizer to event attendances
CREATE OR REPLACE FUNCTION auto_add_organizer_to_event_attendances()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the attempt for debugging
  RAISE LOG 'Auto-adding organizer % to event % attendances', NEW.organizer_id, NEW.id;
  
  -- Insert the organizer as an attendee with "attending" status
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
  ON CONFLICT (user_id, event_id) DO NOTHING;
  
  -- Update attendee count in events table
  UPDATE events
  SET attendee_count = attendee_count + 1,
      updated_at = now()
  WHERE id = NEW.id;
  
  RAISE LOG 'Successfully added organizer % to event % attendances', NEW.organizer_id, NEW.id;
  RETURN NEW;
  
EXCEPTION
  WHEN unique_violation THEN
    -- Handle duplicate key violations (shouldn't happen with ON CONFLICT, but just in case)
    RAISE LOG 'Organizer % already attending event %', NEW.organizer_id, NEW.id;
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-add organizer to event attendances
DROP TRIGGER IF EXISTS auto_add_organizer_attendance_trigger ON events;
CREATE TRIGGER auto_add_organizer_attendance_trigger
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_organizer_to_event_attendances();

-- Add a comment for documentation
COMMENT ON FUNCTION auto_add_organizer_to_event_attendances() IS 'Automatically adds event organizer to event_attendances table when a new event is created. Includes comprehensive error handling to prevent event creation failures.';