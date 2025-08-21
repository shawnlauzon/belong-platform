/*
  # Change event_attendances to use composite primary key (user_id, event_id)

  1. Primary Key Change
    - Drop existing primary key constraint on `id` column
    - Add composite primary key on (user_id, event_id) to match community_memberships pattern
    - Drop the now-unnecessary `id` column

  2. Foreign Key Constraints
    - Add missing foreign key constraint from user_id to profiles(id)
    - Existing foreign key constraint to events(id) already exists

  3. Benefits
    - Matches community_memberships table structure 
    - Eliminates redundant UUID column
    - Application already expects this behavior with upsert conflict resolution
*/

-- Drop the existing primary key constraint
ALTER TABLE event_attendances DROP CONSTRAINT event_attendances_pkey;

-- Add foreign key constraint for user_id if it doesn't already exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'event_attendances_user_id_fkey'
    ) THEN
        ALTER TABLE event_attendances 
        ADD CONSTRAINT event_attendances_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add composite primary key
ALTER TABLE event_attendances 
ADD CONSTRAINT event_attendances_pkey 
PRIMARY KEY (user_id, event_id);

-- Drop the id column as it's no longer needed
ALTER TABLE event_attendances DROP COLUMN id;