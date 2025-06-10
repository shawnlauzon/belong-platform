/*
  # Create triggers for automatic member count updates

  1. New Triggers
    - `community_memberships_insert_trigger` - Fires after INSERT
    - `community_memberships_delete_trigger` - Fires after DELETE
    - `community_memberships_update_trigger` - Fires after UPDATE (for community changes)

  2. Functionality
    - Automatically updates member_count when memberships change
    - Handles all CRUD operations on community_memberships
    - Ensures data consistency without manual intervention

  3. Performance
    - Triggers fire only on actual membership changes
    - Uses efficient counting queries
    - Updates are atomic and consistent
*/

-- Create trigger for INSERT operations
DROP TRIGGER IF EXISTS community_memberships_insert_trigger ON community_memberships;
CREATE TRIGGER community_memberships_insert_trigger
  AFTER INSERT ON community_memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_community_member_count();

-- Create trigger for DELETE operations
DROP TRIGGER IF EXISTS community_memberships_delete_trigger ON community_memberships;
CREATE TRIGGER community_memberships_delete_trigger
  AFTER DELETE ON community_memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_community_member_count();

-- Create trigger for UPDATE operations (in case community_id changes)
DROP TRIGGER IF EXISTS community_memberships_update_trigger ON community_memberships;
CREATE TRIGGER community_memberships_update_trigger
  AFTER UPDATE ON community_memberships
  FOR EACH ROW
  WHEN (OLD.community_id IS DISTINCT FROM NEW.community_id)
  EXECUTE FUNCTION update_community_member_count();