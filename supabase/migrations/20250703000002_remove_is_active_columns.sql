-- Remove is_active columns and rely on soft deletion pattern (deleted_at/deleted_by)
-- This migration standardizes our deletion approach across all tables

-- First update RLS policies to use soft deletion pattern instead of is_active
DROP POLICY IF EXISTS "Organizers can update their communities" ON communities;
CREATE POLICY "Organizers can update their communities" 
ON communities 
FOR UPDATE 
USING (auth.uid() = organizer_id AND deleted_at IS NULL);

-- Check for other policies that might use is_active and update them
-- (Add more policy updates here if found)

-- Now remove is_active columns
ALTER TABLE communities 
DROP COLUMN IF EXISTS is_active;

ALTER TABLE events
DROP COLUMN IF EXISTS is_active;

ALTER TABLE resources
DROP COLUMN IF EXISTS is_active;