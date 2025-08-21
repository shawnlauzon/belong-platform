-- Migration: Add gathering support to shoutouts table

-- Add gathering_id column to shoutouts table
ALTER TABLE shoutouts 
ADD COLUMN gathering_id UUID REFERENCES gatherings(id) ON DELETE CASCADE;

-- Add XOR constraint to ensure exactly one target (resource_id XOR gathering_id)
ALTER TABLE shoutouts 
ADD CONSTRAINT shoutouts_target_xor 
CHECK ((resource_id IS NOT NULL)::int + (gathering_id IS NOT NULL)::int = 1);

-- Update the existing foreign key constraint name for consistency (if needed)
-- Note: The existing resource_id constraint should already exist from previous migrations