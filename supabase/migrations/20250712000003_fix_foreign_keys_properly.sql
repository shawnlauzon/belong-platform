-- Migration: Fix foreign key constraints for gatherings table

-- First, drop the old constraint with the incorrect name
ALTER TABLE gatherings 
DROP CONSTRAINT IF EXISTS events_community_id_fkey;

-- Add the properly named foreign key constraint for community_id
ALTER TABLE gatherings 
ADD CONSTRAINT gatherings_community_id_fkey 
FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE;

-- Add the missing foreign key constraint for organizer_id
ALTER TABLE gatherings 
ADD CONSTRAINT gatherings_organizer_id_fkey 
FOREIGN KEY (organizer_id) REFERENCES profiles(id) ON DELETE CASCADE;