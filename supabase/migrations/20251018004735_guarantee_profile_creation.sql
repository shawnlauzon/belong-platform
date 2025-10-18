-- Migration: Guarantee profile creation for all future auth users
-- This migration fixes the handle_new_user trigger to fail hard if profile creation fails.
-- This ensures future signups either succeed completely or fail completely.
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  user_email text;
  user_meta jsonb;
BEGIN
  -- Get the email, handling potential null values
  user_email := COALESCE(NEW.email, '');

  -- Ensure user_metadata is never null
  user_meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

  -- Log the attempt for debugging
  RAISE LOG 'Creating profile for user: % with email: % and metadata: %', NEW.id, user_email, user_meta;

  -- Insert the profile - ON CONFLICT handles race conditions
  -- If this fails, the entire auth.users insert will be rolled back
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
    user_meta,
    COALESCE(NEW.created_at, now()),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    user_metadata = EXCLUDED.user_metadata,
    updated_at = now();

  RAISE LOG 'Successfully created/updated profile for user: %', NEW.id;
  RETURN NEW;

  -- NOTE: We removed the EXCEPTION block that was swallowing errors.
  -- Now any failure will propagate and cause the transaction to roll back,
  -- ensuring we never have an auth.user without a corresponding profile.
END;
$$;
