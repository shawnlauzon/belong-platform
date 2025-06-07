/*
  # Fix profile insertion permissions for trigger

  1. Changes
    - Update service role policy to allow profile insertion
    - Add policy for authenticated users to insert their own profile
    - Make trigger function more robust with error handling
    - Use proper user metadata field from auth.users

  2. Security
    - Service role can insert profiles (needed for trigger)
    - Authenticated users can insert their own profile
    - Maintains existing read/update policies
*/

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Allow service role to insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Create a more permissive policy for the service role
CREATE POLICY "Allow service role to insert profiles"
  ON profiles
  FOR INSERT
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to insert their own profile (backup)
CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Update the trigger function to be more robust
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert the profile with proper error handling
  INSERT INTO public.profiles (id, email, user_metadata)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    user_metadata = EXCLUDED.user_metadata,
    updated_at = now();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();