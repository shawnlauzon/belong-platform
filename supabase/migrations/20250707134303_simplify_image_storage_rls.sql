/*
  # Simplify Image Storage RLS Policies

  1. Changes
    - Drop all existing RLS policies on storage.objects for images bucket
    - Create single simplified policy: users can only access files in their own {userId}/ folder
    - Support new naming convention: {userId}/{entityType}-{entityId}-{filename}

  2. Security
    - Each user can only access files in their own user ID folder
    - Public read access to all images in the bucket
    - Simplified path validation using first folder element as user ID

  3. New Path Structure
    - Temp files: {userId}/temp-upload-{timestamp}-{random}.{ext}
    - Permanent files: {userId}/{entityType}-{entityId}-{filename}
*/

-- Drop all existing image storage policies
DROP POLICY IF EXISTS "Users can upload to their folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own images" ON storage.objects;

-- Create single comprehensive policy for authenticated users
-- Users can manage all files in their own folder: {userId}/*
CREATE POLICY "Users can manage files in their folder" ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'images' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Public read access to all images
CREATE POLICY "Anyone can view images" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'images');