-- Rename 'scheduled' status to 'active' for resources
-- This makes the status name work semantically for both events and resources

-- Rename the enum value
ALTER TYPE resource_status RENAME VALUE 'scheduled' TO 'active';
