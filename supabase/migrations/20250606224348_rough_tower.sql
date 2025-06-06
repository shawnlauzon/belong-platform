/*
  # Update member_id to creator_id

  1. Changes
    - Rename member_id column to creator_id in resources table
    - Update foreign key constraint name
    - Update indexes to use new column name

  2. Security
    - Maintains existing RLS policies
    - Updates policies to use new column name
*/

-- Rename the column from member_id to creator_id
ALTER TABLE public.resources 
RENAME COLUMN member_id TO creator_id;

-- Drop the old foreign key constraint
ALTER TABLE public.resources 
DROP CONSTRAINT IF EXISTS resources_member_id_fkey;

-- Add the new foreign key constraint with updated name
ALTER TABLE public.resources
ADD CONSTRAINT resources_creator_id_fkey 
FOREIGN KEY (creator_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Drop old index and create new one with updated name
DROP INDEX IF EXISTS resources_member_id_idx;
CREATE INDEX resources_creator_id_idx ON public.resources(creator_id);

-- Update RLS policies to use new column name
DROP POLICY IF EXISTS "Users can insert their own resources" ON public.resources;
DROP POLICY IF EXISTS "Users can update their own resources" ON public.resources;

CREATE POLICY "Users can insert their own resources"
  ON public.resources
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own resources"
  ON public.resources
  FOR UPDATE
  TO public
  USING (auth.uid() = creator_id);