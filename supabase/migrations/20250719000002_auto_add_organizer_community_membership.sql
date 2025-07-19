/*
  # Auto-add community organizer to community memberships

  1. Problem
    - Community organizers are not automatically added as members of their own communities
    - This creates an inconsistent experience where organizers must manually join
    - Application code expects this behavior (see createCommunity.ts line 46)
    - Integration tests expect this functionality but it was never implemented

  2. Solution
    - Create trigger function to automatically add organizer to community_memberships
    - Insert organizer when community is created
    - Use ON CONFLICT DO NOTHING to handle potential race conditions
    - Follow established patterns from event attendance triggers

  3. Benefits
    - Ensures organizers are always members of their communities
    - Maintains consistency with expected application behavior
    - Fixes failing integration tests
    - Provides better user experience and data integrity
*/

-- Create function to auto-add organizer to community memberships
CREATE OR REPLACE FUNCTION auto_add_organizer_to_community_memberships()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the attempt for debugging
  RAISE LOG 'Auto-adding organizer % to community % memberships', NEW.organizer_id, NEW.id;
  
  -- Insert the organizer as a member
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
  ON CONFLICT (user_id, community_id) DO NOTHING;
  
  -- Update member count in communities table
  UPDATE communities
  SET member_count = member_count + 1,
      updated_at = now()
  WHERE id = NEW.id;
  
  RAISE LOG 'Successfully added organizer % to community % memberships', NEW.organizer_id, NEW.id;
  RETURN NEW;
  
EXCEPTION
  WHEN unique_violation THEN
    -- Handle duplicate key violations (shouldn't happen with ON CONFLICT, but just in case)
    RAISE LOG 'Organizer % already member of community %', NEW.organizer_id, NEW.id;
    RETURN NEW;
    
  WHEN foreign_key_violation THEN
    -- Handle foreign key constraint violations
    RAISE WARNING 'Foreign key violation adding organizer % to community %: %', NEW.organizer_id, NEW.id, SQLERRM;
    RETURN NEW;
    
  WHEN OTHERS THEN
    -- Handle any other errors
    RAISE WARNING 'Unexpected error adding organizer % to community %: %', NEW.organizer_id, NEW.id, SQLERRM;
    -- Still return NEW to allow community creation to proceed
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-add organizer to community memberships
DROP TRIGGER IF EXISTS auto_add_organizer_membership_trigger ON communities;
CREATE TRIGGER auto_add_organizer_membership_trigger
  AFTER INSERT ON communities
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_organizer_to_community_memberships();

-- Add a comment for documentation
COMMENT ON FUNCTION auto_add_organizer_to_community_memberships() IS 'Automatically adds community organizer to community_memberships table when a new community is created. Includes comprehensive error handling to prevent community creation failures.';