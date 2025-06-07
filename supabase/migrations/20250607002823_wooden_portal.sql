/*
  # Setup storage for image uploads
  
  This migration ensures the images bucket exists and is properly configured.
  Storage policies need to be set up through the Supabase dashboard or via the service role.
  
  1. Storage Setup
    - Ensures images bucket exists
    - Sets up proper configuration for image uploads
*/

-- Insert the images bucket if it doesn't exist
-- This uses INSERT ... ON CONFLICT to avoid errors if bucket already exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;