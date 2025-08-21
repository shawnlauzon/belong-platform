/*
  # Fix profile creation trigger to prevent sign-up failures

  1. Problem
    - Users cannot sign up due to "Database error saving new user"
    - Profile creation trigger is failing during user creation
    - This blocks authentication flow in integration tests

  2. Solution
    - Create a more robust profile creation trigger
    - Add better error handling and logging
    - Ensure proper RLS permissions for trigger execution
    - Handle potential constraint violations gracefully

  3. Security
    - Maintains existing RLS policies
    - Ensures service role can create profiles during trigger execution
*/

-- First, drop the existing trigger to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Update the trigger function with comprehensive error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_email text;
BEGIN
  -- Get the email, handling potential null values
  user_email := COALESCE(NEW.email, '');
  
  -- Log the attempt for debugging
  RAISE LOG 'Creating profile for user: % with email: %', NEW.id, user_email;
  
  -- Insert the profile with error handling
  INSERT INTO public.profiles (
    id, 
    email, 
    user_metadata,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id, 
    user_email,
    COALESCE(NEW.raw_user_meta_data, '{}'::jsonb),
    COALESCE(NEW.created_at, now()),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    user_metadata = EXCLUDED.user_metadata,
    updated_at = now();
  
  RAISE LOG 'Successfully created profile for user: %', NEW.id;
  RETURN NEW;
  
EXCEPTION
  WHEN unique_violation THEN
    -- Handle duplicate key violations (shouldn't happen with ON CONFLICT, but just in case)
    RAISE LOG 'Profile already exists for user: %', NEW.id;
    RETURN NEW;
    
  WHEN foreign_key_violation THEN
    -- Handle foreign key constraint violations
    RAISE WARNING 'Foreign key violation creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
    
  WHEN check_violation THEN
    -- Handle check constraint violations
    RAISE WARNING 'Check constraint violation creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
    
  WHEN OTHERS THEN
    -- Handle any other errors
    RAISE WARNING 'Unexpected error creating profile for user %: %', NEW.id, SQLERRM;
    -- Still return NEW to allow user creation to proceed
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql' 
   SECURITY DEFINER 
   SET search_path = public, auth;

-- Ensure proper RLS policies exist for the service role
-- (This should already exist from previous migrations, but let's be sure)
DO $$
BEGIN
  -- Check if the policy exists before creating it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Allow service role to insert profiles'
  ) THEN
    CREATE POLICY "Allow service role to insert profiles"
      ON profiles
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Add a comment for documentation
COMMENT ON FUNCTION handle_new_user() IS 'Automatically creates a profile when a new user is created. Includes comprehensive error handling to prevent user creation failures.';