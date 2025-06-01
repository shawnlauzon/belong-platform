/*
  # Fix resources table foreign key

  1. Changes
    - Drop existing foreign key constraint that references non-existent users table
    - Add new foreign key constraint to reference auth.users table correctly
  
  2. Security
    - Maintains existing RLS policies
    - Foreign key with CASCADE delete ensures data consistency
*/

-- Drop the existing foreign key constraint
ALTER TABLE public.resources 
DROP CONSTRAINT IF EXISTS resources_member_id_fkey;

-- Add the correct foreign key constraint to auth.users
ALTER TABLE public.resources
ADD CONSTRAINT resources_member_id_fkey 
FOREIGN KEY (member_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;