-- Remove all gathering-related database structures

-- Drop gathering-related foreign key constraints first
ALTER TABLE public.shoutouts DROP CONSTRAINT IF EXISTS shoutouts_gathering_id_fkey;

-- Remove gathering_id column from shoutouts table
ALTER TABLE public.shoutouts DROP COLUMN IF EXISTS gathering_id;

-- Drop gathering_responses table
DROP TABLE IF EXISTS public.gathering_responses;

-- Drop gatherings table
DROP TABLE IF EXISTS public.gatherings;

-- Remove any RLS policies that might reference gatherings (cleanup)
-- Note: These should be automatically cleaned up when tables are dropped