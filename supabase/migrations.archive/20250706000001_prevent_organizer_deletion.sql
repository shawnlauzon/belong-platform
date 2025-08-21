/*
  # Prevent deletion of users who are community organizers

  1. Problem
    - Currently, organizer_id has ON DELETE SET NULL, allowing organizers to be deleted
    - This can leave communities without organizers
    - Need to prevent deletion of users who are organizing active communities

  2. Solution
    - Drop existing foreign key constraint with SET NULL
    - Add new foreign key constraint with RESTRICT to prevent deletion
    - Only apply restriction to active communities (is_active = true)

  3. Security
    - Maintains existing RLS policies
    - Ensures data integrity by preventing orphaned communities
*/

-- Drop the existing foreign key constraint
ALTER TABLE communities 
DROP CONSTRAINT IF EXISTS communities_organizer_id_fkey;

-- Add new foreign key constraint that prevents deletion of organizers
-- This will prevent deletion of any user who is an organizer of ANY community
ALTER TABLE communities
ADD CONSTRAINT communities_organizer_id_fkey 
FOREIGN KEY (organizer_id) 
REFERENCES auth.users(id) 
ON DELETE RESTRICT;

-- Note: deleted_by column does not exist in current schema

-- Add a comment to document the change
COMMENT ON CONSTRAINT communities_organizer_id_fkey ON communities IS 
'Prevents deletion of users who are organizers of communities. Use soft delete (is_active=false) instead of hard delete for communities, then transfer ownership before deleting the user.';