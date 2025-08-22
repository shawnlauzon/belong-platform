-- Replace multiple conflicting update policies with a single comprehensive one

-- Drop all existing update policies
DROP POLICY IF EXISTS "Authors can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Delete comments with proper permissions" ON public.comments;

-- Create single comprehensive update policy that handles both editing and deleting
CREATE POLICY "Comments update policy" ON public.comments
    FOR UPDATE 
    USING (
        -- Comment author can always update/delete their comments
        auth.uid() = author_id 
        OR 
        -- Resource owner can delete (but not edit) comments on their resource
        (resource_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.resources 
            WHERE id = resource_id AND owner_id = auth.uid()
        ))
        OR
        -- Shoutout sender can delete (but not edit) comments on their shoutout  
        (shoutout_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.shoutouts 
            WHERE id = shoutout_id AND sender_id = auth.uid()
        ))
    );