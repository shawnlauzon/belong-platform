-- Fix RLS policy for community_memberships to allow members to see all other members in their communities
-- The previous policy had a circular dependency that prevented regular members from seeing other members

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Community members can view memberships" ON community_memberships;

-- Create a new policy that allows authenticated users to see all memberships 
-- in communities where they are a member, without circular dependency
CREATE POLICY "Community members can view all memberships in their communities" ON community_memberships
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM community_memberships cm
      WHERE cm.community_id = community_memberships.community_id
      AND cm.user_id = auth.uid()
    )
  );