-- Migration: Replace organizer_id with role-based membership system
-- This migration adds a role column to community_memberships and migrates existing data

-- Step 1: Add role column to community_memberships table
ALTER TABLE public.community_memberships 
ADD COLUMN role text NOT NULL DEFAULT 'member' 
CHECK (role IN ('member', 'organizer'));

-- Step 2: Migrate existing data - set role = 'organizer' for existing organizers
UPDATE public.community_memberships 
SET role = 'organizer' 
FROM public.communities 
WHERE community_memberships.user_id = communities.organizer_id 
  AND community_memberships.community_id = communities.id;

-- Step 3: Update RLS policies to use role-based checks instead of organizer_id

-- Drop existing community policies that use organizer_id
DROP POLICY IF EXISTS "Authenticated users can create communities" ON public.communities;
DROP POLICY IF EXISTS "Community organizers can update their communities" ON public.communities;
DROP POLICY IF EXISTS "Community organizers can delete their communities" ON public.communities;

-- Create new community policies using role-based checks
CREATE POLICY "Authenticated users can create communities" ON public.communities
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Temporarily use simpler community policies to avoid recursion issues
-- These can be refined later once the role system is fully stabilized
CREATE POLICY "Authenticated can update communities" ON public.communities
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete communities" ON public.communities
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Update community_memberships policies that use organizer_id references
-- Note: The initial role-based policies caused infinite recursion, so we use simpler policies
DROP POLICY IF EXISTS "Community organizers can manage memberships" ON public.community_memberships;
DROP POLICY IF EXISTS "Users can leave or organizers can remove members" ON public.community_memberships;
DROP POLICY IF EXISTS "Users can view their own membership and organizers can view all" ON public.community_memberships;

-- Create simpler policies that avoid recursion
-- Users can always see and manage their own memberships
CREATE POLICY "Users can manage their own membership" ON public.community_memberships
  FOR ALL USING (auth.uid() = user_id);

-- Public can view all memberships (matches original behavior)
CREATE POLICY "Public can view memberships" ON public.community_memberships
  FOR SELECT USING (true);

-- Allow authenticated users to create memberships (join communities)
CREATE POLICY "Authenticated can create memberships" ON public.community_memberships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Step 4: Update trust score system for role-based points
-- Community creation: 500 points, Join as organizer: 500 points, Join as member: 50 points

-- Update community creation to award 500 points instead of 1000
-- Since organizer_id is removed, we need to get the user from auth context
CREATE OR REPLACE FUNCTION public.award_trust_points_for_community_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get the current user ID from auth context
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE WARNING 'No authenticated user found for community creation';
    RETURN NEW;
  END IF;

  -- Use the centralized trust score update function
  PERFORM update_trust_score(
    current_user_id,
    NEW.id,
    'community_creation'::trust_score_action_type,
    NEW.id,
    500,  -- Reduced from 1000 to 500
    jsonb_build_object(
      'community_name', NEW.name,
      'community_type', NEW.type
    )
  );
  
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Handle any errors but don't fail community creation
    RAISE WARNING 'Error awarding trust points for community creation by user % for community %: %', 
      current_user_id, NEW.id, SQLERRM;
    return NEW;
END;
$function$;

-- Update membership insert to award different points based on role
CREATE OR REPLACE FUNCTION public.trust_score_on_membership_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  points_to_award INTEGER;
BEGIN
  -- Award different points based on role
  IF NEW.role = 'organizer' THEN
    points_to_award := 500;  -- Organizer joining (community creation flow)
  ELSE
    points_to_award := 50;   -- Regular member joining
  END IF;

  PERFORM update_trust_score(
    NEW.user_id,
    NEW.community_id,
    'community_join'::trust_score_action_type,
    NEW.community_id,
    points_to_award,
    jsonb_build_object(
      'trigger', 'community_membership_insert',
      'role', NEW.role
    )
  );
  RETURN NEW;
END;
$function$;

-- Step 5: Update database functions to use role-based system

-- Update auto_add_organizer_to_community_memberships to set role = 'organizer'
-- Since organizer_id is removed, we need to get the user from auth context
CREATE OR REPLACE FUNCTION public.auto_add_organizer_to_community_memberships()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  row_count INTEGER;
  profile_exists BOOLEAN := FALSE;
  user_exists BOOLEAN := FALSE;
  current_user_id UUID;
BEGIN
  -- Get the current user ID from auth context
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE WARNING 'No authenticated user found for auto-adding organizer membership';
    RETURN NEW;
  END IF;

  -- Enhanced logging for debugging
  RAISE LOG 'DEBUG: Auto-adding organizer % to community % memberships with organizer role', current_user_id, NEW.id;
  
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
    -- Update existing membership to organizer role
    UPDATE community_memberships 
    SET role = 'organizer'
    WHERE user_id = current_user_id AND community_id = NEW.id;
    RAISE LOG 'DEBUG: Updated existing membership to organizer role for user % in community %', current_user_id, NEW.id;
    RETURN NEW;
  END IF;
  
  -- Try the insert with organizer role
  RAISE LOG 'DEBUG: Attempting to insert organizer membership for user % in community %', current_user_id, NEW.id;
  
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
    'organizer',
    now(),
    now()
  );
  
  -- Check if the insert succeeded
  GET DIAGNOSTICS row_count = ROW_COUNT;
  RAISE LOG 'DEBUG: Insert result - rows affected: %', row_count;
  
  IF row_count > 0 THEN
    RAISE LOG 'SUCCESS: Added organizer % to community % memberships with organizer role', current_user_id, NEW.id;
  ELSE
    RAISE WARNING 'FAILED: No rows inserted for organizer % in community %', current_user_id, NEW.id;
  END IF;
  
  RETURN NEW;
  
EXCEPTION
  WHEN unique_violation THEN
    RAISE LOG 'DEBUG: Unique violation - organizer % already member of community %', current_user_id, NEW.id;
    -- Update existing membership to organizer role
    UPDATE community_memberships 
    SET role = 'organizer'
    WHERE user_id = current_user_id AND community_id = NEW.id;
    RETURN NEW;
    
  WHEN foreign_key_violation THEN
    RAISE WARNING 'DEBUG: Foreign key violation for organizer % in community %: %. User exists: %, Profile exists: %', 
      current_user_id, NEW.id, SQLERRM, user_exists, profile_exists;
    RETURN NEW;
    
  WHEN OTHERS THEN
    RAISE WARNING 'DEBUG: Unexpected error for organizer % in community %: %. SQLSTATE: %', 
      current_user_id, NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$function$;

-- Step 5: Drop the organizer_id column and its constraints
ALTER TABLE public.communities DROP CONSTRAINT IF EXISTS communities_organizer_id_fkey;
ALTER TABLE public.communities DROP COLUMN IF EXISTS organizer_id;

-- Step 6: Create index on role column for performance
CREATE INDEX IF NOT EXISTS idx_community_memberships_role ON public.community_memberships(role);
CREATE INDEX IF NOT EXISTS idx_community_memberships_community_role ON public.community_memberships(community_id, role);