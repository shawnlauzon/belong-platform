/*
  # Storage Policies for Image Uploads

  1. Storage Policies
    - Allow authenticated users to upload files to the images bucket
    - Allow public read access to uploaded images
    - Allow users to delete their own uploaded files

  2. Security
    - Enable RLS on storage.objects table (if not already enabled)
    - Create policies for INSERT, SELECT, and DELETE operations on images bucket
*/

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to upload files to the images bucket
CREATE POLICY "Allow authenticated users to upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');

-- Policy to allow public read access to images
CREATE POLICY "Allow public read access to images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'images');

-- Policy to allow users to delete their own uploaded files
CREATE POLICY "Allow users to delete their own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'images' AND auth.uid()::text = owner);

-- Policy to allow users to update their own uploaded files
CREATE POLICY "Allow users to update their own images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'images' AND auth.uid()::text = owner)
WITH CHECK (bucket_id = 'images' AND auth.uid()::text = owner);