-- Migration: Add missing foreign key constraints

-- Add foreign key constraint for gatherings.organizer_id -> profiles.id
ALTER TABLE gatherings 
ADD CONSTRAINT gatherings_organizer_id_fkey 
FOREIGN KEY (organizer_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Update the community foreign key name to match the new table name
ALTER TABLE gatherings 
DROP CONSTRAINT IF EXISTS events_community_id_fkey;

ALTER TABLE gatherings 
ADD CONSTRAINT gatherings_community_id_fkey 
FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE;