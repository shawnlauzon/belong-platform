-- Create public_profiles view that exposes only public user data
-- This prevents email and location from being exposed to other users

CREATE OR REPLACE VIEW public_profiles AS
SELECT 
    p.id,
    p.user_metadata->>'first_name' as first_name,
    p.user_metadata->>'last_name' as last_name,
    p.user_metadata->>'full_name' as full_name,
    p.user_metadata->>'avatar_url' as avatar_url,
    p.user_metadata->>'bio' as bio,
    p.created_at,
    p.updated_at
FROM profiles p;

-- Grant SELECT permission to authenticated users
GRANT SELECT ON public_profiles TO authenticated;

-- Add comment for documentation
COMMENT ON VIEW public_profiles IS 'Public view of user profiles that excludes private data like email and location';

-- Fix RLS policy on profiles table to prevent unauthorized access to private data
-- Drop the overly permissive policy that allows all users to view all profiles
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;

-- Add restrictive policy: users can only view their own profile
CREATE POLICY "Users can view own profile only" ON profiles
    FOR SELECT 
    USING (auth.uid() = id);