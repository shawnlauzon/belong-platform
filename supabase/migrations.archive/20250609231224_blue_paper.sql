/*
  # Update thanks table to use user_id instead of member_id

  1. Changes
    - Rename from_member_id to from_user_id
    - Rename to_member_id to to_user_id
    - Update foreign key constraints to reference profiles table
    - Update RLS policies to use new column names

  2. Security
    - Maintains existing RLS policies with updated column names
    - Ensures data integrity with proper foreign key constraints
*/

-- First, drop existing foreign key constraints
ALTER TABLE thanks DROP CONSTRAINT IF EXISTS thanks_from_member_id_fkey;
ALTER TABLE thanks DROP CONSTRAINT IF EXISTS thanks_to_member_id_fkey;

-- Rename columns if they exist with old names
DO $$
BEGIN
  -- Check if old column names exist and rename them
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'thanks' AND column_name = 'from_member_id'
  ) THEN
    ALTER TABLE thanks RENAME COLUMN from_member_id TO from_user_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'thanks' AND column_name = 'to_member_id'
  ) THEN
    ALTER TABLE thanks RENAME COLUMN to_member_id TO to_user_id;
  END IF;
END $$;

-- Add new foreign key constraints
ALTER TABLE thanks
ADD CONSTRAINT thanks_from_user_id_fkey1 
FOREIGN KEY (from_user_id) 
REFERENCES profiles(id);

ALTER TABLE thanks
ADD CONSTRAINT thanks_to_user_id_fkey1 
FOREIGN KEY (to_user_id) 
REFERENCES profiles(id);

-- Update the check constraint to use new column names
ALTER TABLE thanks DROP CONSTRAINT IF EXISTS thanks_different_users;
ALTER TABLE thanks ADD CONSTRAINT thanks_different_users 
CHECK (from_user_id <> to_user_id);