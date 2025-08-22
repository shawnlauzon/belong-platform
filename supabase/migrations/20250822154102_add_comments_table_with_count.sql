-- Add comments table for resources and shoutouts
CREATE TABLE IF NOT EXISTS public.comments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
    resource_id uuid REFERENCES public.resources(id) ON DELETE CASCADE,
    shoutout_id uuid REFERENCES public.shoutouts(id) ON DELETE CASCADE,
    author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content text NOT NULL,
    is_edited boolean DEFAULT false,
    is_deleted boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Add constraint to ensure comment is associated with either resource or shoutout, but not both
ALTER TABLE public.comments 
ADD CONSTRAINT comments_target_check 
CHECK (
    (resource_id IS NOT NULL AND shoutout_id IS NULL) OR 
    (resource_id IS NULL AND shoutout_id IS NOT NULL)
);

-- Note: Nesting depth will be enforced at application level

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_resource_id ON public.comments(resource_id);
CREATE INDEX IF NOT EXISTS idx_comments_shoutout_id ON public.comments(shoutout_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON public.comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Authenticated community members can read non-deleted comments
CREATE POLICY "Comments are viewable by community members" ON public.comments
    FOR SELECT 
    TO authenticated
    USING (
        NOT is_deleted 
        AND (
            -- For resource comments: user must be member of resource's community
            (resource_id IS NOT NULL AND is_community_member_of_resource(resource_id, auth.uid()))
            OR
            -- For shoutout comments: user must be member of shoutout's community  
            (shoutout_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.community_memberships cm
                JOIN public.shoutouts s ON s.community_id = cm.community_id
                WHERE s.id = comments.shoutout_id
                AND cm.user_id = auth.uid()
            ))
        )
    );

-- Authenticated users can insert comments if they are community members
CREATE POLICY "Users can insert their own comments" ON public.comments
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = author_id);

-- Users can update their own comments
CREATE POLICY "Users can update their own comments" ON public.comments
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = author_id);

-- Users can delete their own comments (soft delete by setting is_deleted)
CREATE POLICY "Users can delete their own comments" ON public.comments
    FOR DELETE 
    TO authenticated
    USING (auth.uid() = author_id);

-- Add comment_count columns to resources and shoutouts tables
ALTER TABLE public.resources 
ADD COLUMN IF NOT EXISTS comment_count integer DEFAULT 0;

ALTER TABLE public.shoutouts 
ADD COLUMN IF NOT EXISTS comment_count integer DEFAULT 0;

-- Function to increment comment count
CREATE OR REPLACE FUNCTION increment_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.resource_id IS NOT NULL THEN
        UPDATE public.resources 
        SET comment_count = COALESCE(comment_count, 0) + 1 
        WHERE id = NEW.resource_id;
    ELSIF NEW.shoutout_id IS NOT NULL THEN
        UPDATE public.shoutouts 
        SET comment_count = COALESCE(comment_count, 0) + 1 
        WHERE id = NEW.shoutout_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement comment count
CREATE OR REPLACE FUNCTION decrement_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.resource_id IS NOT NULL THEN
        UPDATE public.resources 
        SET comment_count = GREATEST(COALESCE(comment_count, 0) - 1, 0) 
        WHERE id = OLD.resource_id;
    ELSIF OLD.shoutout_id IS NOT NULL THEN
        UPDATE public.shoutouts 
        SET comment_count = GREATEST(COALESCE(comment_count, 0) - 1, 0) 
        WHERE id = OLD.shoutout_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Function to handle comment count on soft delete
CREATE OR REPLACE FUNCTION handle_comment_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- If comment is being soft deleted (is_deleted changed from false to true)
    IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
        IF NEW.resource_id IS NOT NULL THEN
            UPDATE public.resources 
            SET comment_count = GREATEST(COALESCE(comment_count, 0) - 1, 0) 
            WHERE id = NEW.resource_id;
        ELSIF NEW.shoutout_id IS NOT NULL THEN
            UPDATE public.shoutouts 
            SET comment_count = GREATEST(COALESCE(comment_count, 0) - 1, 0) 
            WHERE id = NEW.shoutout_id;
        END IF;
    -- If comment is being restored (is_deleted changed from true to false)
    ELSIF OLD.is_deleted = true AND NEW.is_deleted = false THEN
        IF NEW.resource_id IS NOT NULL THEN
            UPDATE public.resources 
            SET comment_count = COALESCE(comment_count, 0) + 1 
            WHERE id = NEW.resource_id;
        ELSIF NEW.shoutout_id IS NOT NULL THEN
            UPDATE public.shoutouts 
            SET comment_count = COALESCE(comment_count, 0) + 1 
            WHERE id = NEW.shoutout_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for comment count management
CREATE TRIGGER comments_increment_count 
    AFTER INSERT ON public.comments 
    FOR EACH ROW 
    WHEN (NEW.is_deleted = false)
    EXECUTE FUNCTION increment_comment_count();

CREATE TRIGGER comments_decrement_count 
    AFTER DELETE ON public.comments 
    FOR EACH ROW 
    EXECUTE FUNCTION decrement_comment_count();

CREATE TRIGGER comments_handle_soft_delete 
    AFTER UPDATE ON public.comments 
    FOR EACH ROW 
    WHEN (OLD.is_deleted IS DISTINCT FROM NEW.is_deleted)
    EXECUTE FUNCTION handle_comment_soft_delete();

-- Update existing counts based on current comments (if any exist)
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