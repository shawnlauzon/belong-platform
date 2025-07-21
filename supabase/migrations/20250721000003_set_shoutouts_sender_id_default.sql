/*
  # Set default sender_id for shoutouts

  1. Changes
    - Sets sender_id default to auth.uid()
  
  2. Rationale
    - Automatically sets the sender to the currently authenticated user
    - Reduces required parameters when creating shoutouts
    - Ensures consistency with authentication
*/

-- Set default value for sender_id to current authenticated user
ALTER TABLE shoutouts 
  ALTER COLUMN sender_id SET DEFAULT auth.uid();