-- Make computed columns NOT NULL by adding explicit return type annotations
-- This tells PostgREST and the type generator that these functions never return null

-- Update expires_at function to explicitly indicate it can return null for events
-- (events don't expire, so expires_at should be null for them)
COMMENT ON FUNCTION expires_at(resources) IS 'Returns expiration timestamp for resources that auto-expire, null for events';

-- Update is_active function to explicitly indicate it never returns null
-- (all resources are either active or inactive, never unknown)
COMMENT ON FUNCTION is_active(resources) IS '@return_type_nullable false';