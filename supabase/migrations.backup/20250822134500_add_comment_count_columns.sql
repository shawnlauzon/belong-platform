-- Add comment_count columns to resources and shoutouts tables
ALTER TABLE public.resources 
ADD COLUMN IF NOT EXISTS comment_count integer DEFAULT 0;

ALTER TABLE public.shoutouts 
ADD COLUMN IF NOT EXISTS comment_count integer DEFAULT 0;

-- Update existing counts based on current comments
UPDATE public.resources r
SET comment_count = (
    SELECT COUNT(*) 
    FROM public.comments c 
    WHERE c.resource_id = r.id 
    AND c.is_deleted = false
);

UPDATE public.shoutouts s
SET comment_count = (
    SELECT COUNT(*) 
    FROM public.comments c 
    WHERE c.shoutout_id = s.id 
    AND c.is_deleted = false
);