/*
  # Remove duplicate organizer membership trigger

  1. Problem
    - Two triggers both trying to create organizer membership when community is created:
      * auto_create_organizer_membership_trigger (old, basic)
      * auto_add_organizer_membership_trigger (new, comprehensive)
    - This causes "duplicate key value violates unique constraint" errors
    - Both triggers fire on the same event (AFTER INSERT ON communities)

  2. Solution
    - Remove the old basic trigger and its function
    - Keep the new comprehensive trigger with error handling and member count updates
    - This maintains the expected functionality while fixing the conflict

  3. Benefits
    - Eliminates duplicate key constraint violations
    - Keeps the better implementation with error handling
    - Maintains proper member count tracking
    - Fixes all failing integration tests
*/

-- Remove the old basic trigger
DROP TRIGGER IF EXISTS auto_create_organizer_membership_trigger ON communities;

-- Remove the old basic function
DROP FUNCTION IF EXISTS auto_create_organizer_membership();

-- Add a comment documenting the change
COMMENT ON TRIGGER auto_add_organizer_membership_trigger ON communities IS 'Automatically adds community organizer to community_memberships table when a new community is created. Replaces the old auto_create_organizer_membership_trigger with better error handling and member count updates.';