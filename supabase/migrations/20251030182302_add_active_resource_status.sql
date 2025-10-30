-- Part 1: Add 'active' to resource_status enum
-- Must be in separate migration due to PostgreSQL enum limitations

ALTER TYPE resource_status ADD VALUE IF NOT EXISTS 'active';
