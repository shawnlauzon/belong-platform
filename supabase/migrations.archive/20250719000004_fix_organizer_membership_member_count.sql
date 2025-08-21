/*
  # Fix organizer membership trigger - remove duplicate member count update

  1. Problem
    - auto_add_organizer_to_community_memberships() updates member_count manually
    - community_memberships_insert_trigger also updates member_count automatically
    - This causes double-counting: member_count becomes 2 instead of 1
    - Tests expect member_count to be 1 for a new community with just the organizer

  2. Solution
    - Remove the manual member_count update from auto_add_organizer_to_community_memberships()
    - Let the existing community_memberships_insert_trigger handle member count updates
    - This ensures consistent member count tracking across all membership operations

  3. Benefits
    - Fixes test failures expecting member_count: 1
    - Eliminates duplicate member count logic
    - Maintains consistency with existing member count management
    - Follows single responsibility principle
*/

-- Update function to remove duplicate member count update
CREATE OR REPLACE FUNCTION auto_add_organizer_to_community_memberships()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the attempt for debugging
  RAISE LOG 'Auto-adding organizer % to community % memberships', NEW.organizer_id, NEW.id;
  
  -- Insert the organizer as a member
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
  ON CONFLICT (user_id, community_id) DO NOTHING;
  
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

-- Update the comment to reflect the change
COMMENT ON FUNCTION auto_add_organizer_to_community_memberships() IS 'Automatically adds community organizer to community_memberships table when a new community is created. Member count is updated automatically by community_memberships_insert_trigger. Includes comprehensive error handling to prevent community creation failures.';