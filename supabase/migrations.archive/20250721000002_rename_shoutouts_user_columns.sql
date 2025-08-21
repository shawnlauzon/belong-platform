/*
  # Rename shoutouts user columns

  1. Changes
    - from_user_id -> sender_id
    - to_user_id -> receiver_id
  
  2. Rationale
    - Provides more consistent naming with other tables
    - sender/receiver is clearer than from/to
*/

-- Rename shoutouts user columns for consistency
-- from_user_id -> sender_id
-- to_user_id -> receiver_id

ALTER TABLE shoutouts 
  RENAME COLUMN from_user_id TO sender_id;

ALTER TABLE shoutouts 
  RENAME COLUMN to_user_id TO receiver_id;