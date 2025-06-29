-- Add is_all_day flag to events table
ALTER TABLE events 
ADD COLUMN is_all_day BOOLEAN NOT NULL DEFAULT false;

-- Add comment to explain the field's purpose
COMMENT ON COLUMN events.is_all_day IS 'When true, the time portion of start/end timestamps should be ignored for display and comparison purposes';