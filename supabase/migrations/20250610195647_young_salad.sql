/*
  # Update member_count default value

  1. Changes
    - Change default value of member_count from 1 to 0
    - This ensures new communities start with accurate member count

  2. Security
    - No changes to RLS policies
    - Maintains existing security model
*/

-- Update the default value for member_count to 0
ALTER TABLE communities 
ALTER COLUMN member_count SET DEFAULT 0;