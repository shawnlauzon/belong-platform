-- Add constraint to prevent 3rd level comment nesting
-- A comment can have a parent, but a comment with a parent cannot have child comments

CREATE OR REPLACE FUNCTION check_comment_nesting_level()
RETURNS TRIGGER AS $$
BEGIN
    -- If this comment has a parent_id, check if the parent already has a parent
    IF NEW.parent_id IS NOT NULL THEN
        -- Check if the parent comment already has a parent (which would make this a 3rd level)
        IF EXISTS (
            SELECT 1 FROM public.comments 
            WHERE id = NEW.parent_id AND parent_id IS NOT NULL
        ) THEN
            RAISE EXCEPTION 'Comments can only be nested 2 levels deep';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to enforce nesting constraint
CREATE TRIGGER prevent_deep_comment_nesting
    BEFORE INSERT ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION check_comment_nesting_level();