-- Add founder membership type and update community creation system

-- Step 1: Create enum for membership roles
CREATE TYPE community_membership_role AS ENUM ('member', 'organizer', 'founder');

-- Step 2: Convert role column from TEXT to enum
ALTER TABLE community_memberships 
  ALTER COLUMN role DROP DEFAULT;
ALTER TABLE community_memberships 
  DROP CONSTRAINT community_memberships_role_check;
ALTER TABLE community_memberships 
  ALTER COLUMN role TYPE community_membership_role 
  USING role::community_membership_role;
ALTER TABLE community_memberships 
  ALTER COLUMN role SET DEFAULT 'member'::community_membership_role;

-- Step 3: Add founder to trust score action types
ALTER TYPE trust_score_action_type ADD VALUE 'community_founder_join';

-- Step 4: Update trust score trigger for new point values
CREATE OR REPLACE FUNCTION trust_score_on_membership_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  points_to_award INTEGER;
  action_type_to_use trust_score_action_type;
BEGIN
  -- Award different points based on role
  IF NEW.role = 'founder' THEN
    points_to_award := 2000;  -- Founder gets 2000 points
    action_type_to_use := 'community_founder_join'::trust_score_action_type;
  ELSIF NEW.role = 'organizer' THEN
    points_to_award := 1000;  -- Organizer gets 1000 points (increased from 500)
    action_type_to_use := 'community_organizer_join'::trust_score_action_type;
  ELSE
    points_to_award := 50;   -- Regular member joining
    action_type_to_use := 'community_member_join'::trust_score_action_type;
  END IF;

  -- Call the updated function - any errors will now propagate
  PERFORM update_trust_score(
    NEW.user_id,
    NEW.community_id,
    action_type_to_use,
    NEW.community_id,
    points_to_award,
    jsonb_build_object(
      'trigger', 'community_membership_insert',
      'role', NEW.role
    )
  );
  
  RETURN NEW;
END;
$$;

-- Step 5: Rename and update community creation trigger function
DROP TRIGGER IF EXISTS auto_add_organizer_to_community_memberships_trigger ON communities;
DROP TRIGGER IF EXISTS auto_add_organizer_membership_trigger ON communities;
DROP FUNCTION IF EXISTS auto_add_organizer_to_community_memberships();

CREATE OR REPLACE FUNCTION auto_add_founder_to_new_community()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  row_count INTEGER;
  profile_exists BOOLEAN := FALSE;
  user_exists BOOLEAN := FALSE;
  current_user_id UUID;
BEGIN
  -- Get the current user ID from auth context
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE WARNING 'No authenticated user found for auto-adding founder membership';
    RETURN NEW;
  END IF;

  -- Enhanced logging for debugging
  RAISE LOG 'DEBUG: Auto-adding founder % to community % memberships with founder role', current_user_id, NEW.id;
  
  -- Check if the user exists in auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = current_user_id) INTO user_exists;
  RAISE LOG 'DEBUG: User % exists in auth.users: %', current_user_id, user_exists;
  
  -- Check if the user has a profile
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = current_user_id) INTO profile_exists;
  RAISE LOG 'DEBUG: Profile exists for user %: %', current_user_id, profile_exists;
  
  -- Check if membership already exists
  PERFORM 1 FROM community_memberships 
  WHERE user_id = current_user_id AND community_id = NEW.id;
  
  IF FOUND THEN
    -- Update existing membership to founder role
    UPDATE community_memberships 
    SET role = 'founder'
    WHERE user_id = current_user_id AND community_id = NEW.id;
    RAISE LOG 'DEBUG: Updated existing membership to founder role for user % in community %', current_user_id, NEW.id;
    RETURN NEW;
  END IF;
  
  -- Try the insert with founder role
  RAISE LOG 'DEBUG: Attempting to insert founder membership for user % in community %', current_user_id, NEW.id;
  
  INSERT INTO community_memberships (
    user_id,
    community_id,
    role,
    created_at,
    updated_at
  )
  VALUES (
    current_user_id,
    NEW.id,
    'founder',
    now(),
    now()
  );
  
  -- Check if the insert succeeded
  GET DIAGNOSTICS row_count = ROW_COUNT;
  RAISE LOG 'DEBUG: Insert result - rows affected: %', row_count;
  
  IF row_count > 0 THEN
    RAISE LOG 'SUCCESS: Added founder % to community % memberships with founder role', current_user_id, NEW.id;
  ELSE
    RAISE WARNING 'FAILED: No rows inserted for founder % in community %', current_user_id, NEW.id;
  END IF;
  
  RETURN NEW;
  
EXCEPTION
  WHEN unique_violation THEN
    RAISE LOG 'DEBUG: Unique violation - founder % already member of community %', current_user_id, NEW.id;
    -- Update existing membership to founder role
    UPDATE community_memberships 
    SET role = 'founder'
    WHERE user_id = current_user_id AND community_id = NEW.id;
    RETURN NEW;
    
  WHEN foreign_key_violation THEN
    RAISE WARNING 'DEBUG: Foreign key violation for founder % in community %: %. User exists: %, Profile exists: %', 
      current_user_id, NEW.id, SQLERRM, user_exists, profile_exists;
    RETURN NEW;
    
  WHEN OTHERS THEN
    RAISE WARNING 'DEBUG: Unexpected error for founder % in community %: %. SQLSTATE: %', 
      current_user_id, NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Step 6: Remove old community creation trust score trigger and function
DROP TRIGGER IF EXISTS award_trust_points_community_creation_trigger ON communities;
DROP FUNCTION IF EXISTS award_trust_points_for_community_creation();

-- Create new founder trigger
CREATE TRIGGER auto_add_founder_to_new_community_trigger
  AFTER INSERT ON communities
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_founder_to_new_community();

-- Step 7: Clean up and fix RLS policies
DROP POLICY IF EXISTS "Authenticated can create memberships" ON community_memberships;
DROP POLICY IF EXISTS "Authenticated users can join communities" ON community_memberships;
DROP POLICY IF EXISTS "Public can view memberships" ON community_memberships;
DROP POLICY IF EXISTS "Users can manage their own membership" ON community_memberships;

-- Users can leave communities (delete their own membership)
CREATE POLICY "Users can leave communities"
ON community_memberships FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Users can join communities as members only
-- (This will need further restrictions for paid memberships in the future)
CREATE POLICY "Users can join as members"
ON community_memberships FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND role = 'member'
);

-- No UPDATE policy for regular users - they cannot change their role
-- (In the future, we might add a policy for organizers/founders to manage member roles)

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION auto_add_founder_to_new_community TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION trust_score_on_membership_insert TO authenticated, service_role;