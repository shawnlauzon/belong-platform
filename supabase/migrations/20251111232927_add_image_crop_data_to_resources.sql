-- Add image_crop_data column to resources table
-- Stores crop metadata for each image in imageUrls array
-- Each entry can be null (no crop) or contain crop coordinates (0-1 range)
ALTER TABLE public.resources
ADD COLUMN image_crop_data JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.resources.image_crop_data IS 'Array of crop data objects matching imageUrls. Each entry: {x, y, width, height} in 0-1 range, or null if uncropped';
