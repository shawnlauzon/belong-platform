-- Drop the incorrect image_crop_data column
ALTER TABLE public.resources
DROP COLUMN IF EXISTS image_crop_data;

-- Add image_urls_uncropped column
-- Parallel array to image_urls: contains original URL when image_urls[i] is cropped, NULL when not cropped
ALTER TABLE public.resources
ADD COLUMN image_urls_uncropped TEXT[] DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.resources.image_urls_uncropped IS 'Parallel array to image_urls. Contains original URL when image_urls[i] is cropped, NULL when not cropped';
