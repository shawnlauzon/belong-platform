-- Fix RLS policies for comments to allow proper permissions

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;

-- Create proper update policy that allows:
-- 1. Authors to update their own comments (content changes)
-- 2. Authors, resource owners, and shoutout owners to delete comments (soft delete)
CREATE POLICY "Authors can update their own comments" ON public.comments
    FOR UPDATE 
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);

-- Create policy for soft deletion that allows resource/shoutout owners
CREATE POLICY "Delete comments with proper permissions" ON public.comments
    FOR UPDATE 
    USING (
        -- Comment author can always delete
        auth.uid() = author_id 
        OR 
        -- Resource owner can delete comments on their resource
        (resource_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.resources 
            WHERE id = resource_id AND owner_id = auth.uid()
        ))
        OR
        -- Shoutout sender can delete comments on their shoutout  
        (shoutout_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.shoutouts 
            WHERE id = shoutout_id AND sender_id = auth.uid()
        ))
    )
    WITH CHECK (
        -- Comment author can make any changes, others can only set is_deleted = true
        auth.uid() = author_id 
        OR 
        (auth.uid() != author_id AND is_deleted = true)
    );