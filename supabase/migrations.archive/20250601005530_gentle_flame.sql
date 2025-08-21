/*
  # Add foreign key constraint for member_id

  1. Changes
    - Add foreign key constraint from resources.member_id to auth.users.id
    - This enables proper joins between resources and user data
    - Ensures referential integrity for member relationships
    - Adds CASCADE deletion to automatically remove resources when a user is deleted

  2. Security
    - No changes to RLS policies
    - Maintains existing security model while adding data integrity
*/

DO $$ BEGIN
  -- Check if the foreign key doesn't already exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'resources_member_id_fkey'
    AND table_name = 'resources'
  ) THEN
    -- Add the foreign key constraint
    ALTER TABLE public.resources
    ADD CONSTRAINT resources_member_id_fkey 
    FOREIGN KEY (member_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;
  END IF;
END $$;