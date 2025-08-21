/*
  # Update thanks table column names and constraints

  1. Changes
    - Rename from_member_id to from_user_id (if needed)
    - Rename to_member_id to to_user_id (if needed)
    - Update foreign key constraints to reference profiles table
    - Update check constraint for different users

  2. Security
    - Maintains existing RLS policies
    - Updates foreign key references to profiles table
*/

-- First, drop existing foreign key constraints if they exist
DO $$
BEGIN
  -- Drop old constraints if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'thanks_from_member_id_fkey' 
    AND table_name = 'thanks'
  ) THEN
    ALTER TABLE thanks DROP CONSTRAINT thanks_from_member_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'thanks_to_member_id_fkey' 
    AND table_name = 'thanks'
  ) THEN
    ALTER TABLE thanks DROP CONSTRAINT thanks_to_member_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'thanks_from_member_id_fkey1' 
    AND table_name = 'thanks'
  ) THEN
    ALTER TABLE thanks DROP CONSTRAINT thanks_from_member_id_fkey1;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'thanks_to_member_id_fkey1' 
    AND table_name = 'thanks'
  ) THEN
    ALTER TABLE thanks DROP CONSTRAINT thanks_to_member_id_fkey1;
  END IF;

  -- Drop new constraints if they already exist
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'thanks_from_user_id_fkey1' 
    AND table_name = 'thanks'
  ) THEN
    ALTER TABLE thanks DROP CONSTRAINT thanks_from_user_id_fkey1;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'thanks_to_user_id_fkey1' 
    AND table_name = 'thanks'
  ) THEN
    ALTER TABLE thanks DROP CONSTRAINT thanks_to_user_id_fkey1;
  END IF;
END $$;

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

-- Add new foreign key constraints only if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'thanks_from_user_id_fkey1' 
    AND table_name = 'thanks'
  ) THEN
    ALTER TABLE thanks
    ADD CONSTRAINT thanks_from_user_id_fkey1 
    FOREIGN KEY (from_user_id) 
    REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'thanks_to_user_id_fkey1' 
    AND table_name = 'thanks'
  ) THEN
    ALTER TABLE thanks
    ADD CONSTRAINT thanks_to_user_id_fkey1 
    FOREIGN KEY (to_user_id) 
    REFERENCES profiles(id);
  END IF;
END $$;

-- Update the check constraint to use new column names
DO $$
BEGIN
  -- Drop old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'thanks_different_users' 
    AND table_name = 'thanks'
  ) THEN
    ALTER TABLE thanks DROP CONSTRAINT thanks_different_users;
  END IF;

  -- Add new constraint
  ALTER TABLE thanks ADD CONSTRAINT thanks_different_users 
  CHECK (from_user_id <> to_user_id);
END $$;