-- Remove soft delete columns from shoutouts table
-- These columns were not being used and complicate the data model

ALTER TABLE shoutouts 
DROP COLUMN IF EXISTS deleted_at,
DROP COLUMN IF EXISTS deleted_by;