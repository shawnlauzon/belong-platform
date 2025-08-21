-- Allow claim users to update their claims to 'interested' status
-- This replaces the previous restrictive policy that only allowed 'pending' and 'cancelled'

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Claim users can transition between pending and cancelled" ON resource_claims;

-- Create new policy that allows claim users to manage pending, cancelled, and interested statuses
CREATE POLICY "Claim users can manage their claim status" ON resource_claims
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id 
    AND status IN ('pending', 'cancelled', 'interested')
  );