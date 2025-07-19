-- Update foreign key constraint for resource_claims.user_id to reference profiles.id instead of auth.users.id

-- Drop existing constraint that references auth.users
ALTER TABLE resource_claims 
DROP CONSTRAINT resource_claims_user_id_fkey;

-- Add new constraint that references profiles
ALTER TABLE resource_claims 
ADD CONSTRAINT resource_claims_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;