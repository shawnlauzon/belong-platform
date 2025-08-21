/*
  # Create storage bucket and policies for image uploads

  1. Storage Setup
    - Create images bucket with proper configuration
    - Set file size limits and allowed MIME types
    - Enable public access for viewing images

  2. Security Policies
    - Authenticated users can upload to their own folders
    - Users can manage (update/delete) their own images
    - Public read access for displaying images
    - Folder-based access control using user ID
*/

-- Create the images bucket
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

-- Create storage policies using the storage schema functions
-- Policy for uploading images (users can upload to folders that start with their user ID)
CREATE POLICY "Authenticated users can upload images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy for updating images (users can update their own images)
CREATE POLICY "Users can update their own images" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy for deleting images (users can delete their own images)
CREATE POLICY "Users can delete their own images" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy for viewing images (public read access)
CREATE POLICY "Public can view images" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'images');