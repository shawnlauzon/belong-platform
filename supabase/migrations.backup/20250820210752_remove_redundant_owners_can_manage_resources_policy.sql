-- Remove redundant generic policy and replace with specific SELECT policy
-- The generic "owners_can_manage_resources" policy was too broad and applied to all operations
-- The real issue is that owners need to SELECT their resources immediately after creation
-- before community associations are established for community_members_can_view_resources

-- Drop the redundant generic policy  
DROP POLICY IF EXISTS "owners_can_manage_resources" ON "public"."resources";

-- Add specific SELECT policy for resource owners
-- This allows owners to view their own resources immediately after creation
CREATE POLICY "owners_can_select_their_resources" ON "public"."resources" 
  FOR SELECT TO "authenticated" 
  USING (("auth"."uid"() = "owner_id"));