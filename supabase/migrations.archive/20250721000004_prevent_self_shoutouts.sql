/*
  # Prevent self-shoutouts

  1. Changes
    - Adds CHECK constraint to prevent sender_id = receiver_id
  
  2. Rationale
    - Users should not be able to send shoutouts to themselves
    - Maintains data integrity and logical business rules
*/

-- Add constraint to prevent users from sending shoutouts to themselves
ALTER TABLE shoutouts 
  ADD CONSTRAINT shoutouts_no_self_shoutouts 
  CHECK (sender_id != receiver_id);