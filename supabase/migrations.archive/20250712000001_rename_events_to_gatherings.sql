-- Migration: Rename events to gatherings and event_attendances to gathering_responses
-- Also update community_memberships structure

-- Disable RLS policies temporarily
ALTER TABLE event_attendances DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE community_memberships DISABLE ROW LEVEL SECURITY;

-- Drop existing policies for events and event_attendances
DROP POLICY IF EXISTS "Events are viewable by community members" ON events;
DROP POLICY IF EXISTS "Events can be created by community members" ON events;
DROP POLICY IF EXISTS "Events can be updated by their organizers" ON events;
DROP POLICY IF EXISTS "Events can be deleted by their organizers" ON events;

DROP POLICY IF EXISTS "Event attendances are viewable by community members" ON event_attendances;
DROP POLICY IF EXISTS "Event attendances can be created by community members" ON event_attendances;
DROP POLICY IF EXISTS "Event attendances can be updated by the user" ON event_attendances;
DROP POLICY IF EXISTS "Event attendances can be deleted by the user" ON event_attendances;

-- Drop existing indexes
DROP INDEX IF EXISTS idx_events_community_id;
DROP INDEX IF EXISTS idx_events_organizer_id;
DROP INDEX IF EXISTS idx_events_start_date_time;
DROP INDEX IF EXISTS idx_event_attendances_event_id;
DROP INDEX IF EXISTS idx_event_attendances_user_id;
DROP INDEX IF EXISTS idx_event_attendances_composite;

-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS auto_add_organizer_attendance ON events;
DROP TRIGGER IF EXISTS update_event_attendee_count ON event_attendances;
DROP FUNCTION IF EXISTS auto_add_organizer_attendance();
DROP FUNCTION IF EXISTS update_event_attendee_count();

-- Step 1: Rename tables
ALTER TABLE events RENAME TO gatherings;
ALTER TABLE event_attendances RENAME TO gathering_responses;

-- Step 2: Update gathering_responses column names
ALTER TABLE gathering_responses RENAME COLUMN event_id TO gathering_id;

-- Step 3: Update community_memberships structure
-- Add updated_at column
ALTER TABLE community_memberships ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- Rename joined_at to created_at
ALTER TABLE community_memberships RENAME COLUMN joined_at TO created_at;

-- Update the updated_at column for existing records to match created_at
UPDATE community_memberships SET updated_at = created_at;

-- Add trigger to update updated_at on community_memberships
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_community_memberships_updated_at
    BEFORE UPDATE ON community_memberships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 4: Recreate functions for gatherings
CREATE OR REPLACE FUNCTION auto_add_organizer_attendance()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert organizer as attendee with 'attending' status
    INSERT INTO gathering_responses (gathering_id, user_id, status)
    VALUES (NEW.id, NEW.organizer_id, 'attending')
    ON CONFLICT (gathering_id, user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_gathering_attendee_count()
RETURNS TRIGGER AS $$
DECLARE
    gathering_id_val UUID;
BEGIN
    -- Determine which gathering to update based on the operation
    IF TG_OP = 'DELETE' THEN
        gathering_id_val := OLD.gathering_id;
    ELSE
        gathering_id_val := NEW.gathering_id;
    END IF;
    
    -- Update the attendee count for the gathering
    UPDATE gatherings 
    SET attendee_count = (
        SELECT COUNT(*) 
        FROM gathering_responses 
        WHERE gathering_id = gathering_id_val 
        AND status = 'attending'
    )
    WHERE id = gathering_id_val;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Recreate triggers
CREATE TRIGGER auto_add_organizer_attendance
    AFTER INSERT ON gatherings
    FOR EACH ROW
    EXECUTE FUNCTION auto_add_organizer_attendance();

CREATE TRIGGER update_gathering_attendee_count
    AFTER INSERT OR UPDATE OR DELETE ON gathering_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_gathering_attendee_count();

-- Step 6: Recreate indexes with new names
CREATE INDEX idx_gatherings_community_id ON gatherings(community_id);
CREATE INDEX idx_gatherings_organizer_id ON gatherings(organizer_id);
CREATE INDEX idx_gatherings_start_date_time ON gatherings(start_date_time);
CREATE INDEX idx_gathering_responses_gathering_id ON gathering_responses(gathering_id);
CREATE INDEX idx_gathering_responses_user_id ON gathering_responses(user_id);
CREATE INDEX idx_gathering_responses_composite ON gathering_responses(gathering_id, user_id);

-- Step 7: Update foreign key constraints
ALTER TABLE gathering_responses DROP CONSTRAINT IF EXISTS event_attendances_event_id_fkey;
ALTER TABLE gathering_responses ADD CONSTRAINT gathering_responses_gathering_id_fkey 
    FOREIGN KEY (gathering_id) REFERENCES gatherings(id) ON DELETE CASCADE;

ALTER TABLE gathering_responses DROP CONSTRAINT IF EXISTS event_attendances_user_id_fkey;
ALTER TABLE gathering_responses ADD CONSTRAINT gathering_responses_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Ensure composite primary key exists
ALTER TABLE gathering_responses DROP CONSTRAINT IF EXISTS event_attendances_pkey;
ALTER TABLE gathering_responses ADD CONSTRAINT gathering_responses_pkey 
    PRIMARY KEY (gathering_id, user_id);

-- Step 8: Recreate RLS policies for gatherings
ALTER TABLE gatherings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gatherings are viewable by community members" ON gatherings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM community_memberships cm
            WHERE cm.community_id = gatherings.community_id
            AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "Gatherings can be created by community members" ON gatherings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM community_memberships cm
            WHERE cm.community_id = gatherings.community_id
            AND cm.user_id = auth.uid()
        )
        AND organizer_id = auth.uid()
    );

CREATE POLICY "Gatherings can be updated by their organizers" ON gatherings
    FOR UPDATE USING (organizer_id = auth.uid());

CREATE POLICY "Gatherings can be deleted by their organizers" ON gatherings
    FOR DELETE USING (organizer_id = auth.uid());

-- Step 9: Recreate RLS policies for gathering_responses
ALTER TABLE gathering_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gathering responses are viewable by community members" ON gathering_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM gatherings g
            JOIN community_memberships cm ON cm.community_id = g.community_id
            WHERE g.id = gathering_responses.gathering_id
            AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "Gathering responses can be created by community members" ON gathering_responses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM gatherings g
            JOIN community_memberships cm ON cm.community_id = g.community_id
            WHERE g.id = gathering_responses.gathering_id
            AND cm.user_id = auth.uid()
        )
        AND user_id = auth.uid()
    );

CREATE POLICY "Gathering responses can be updated by the user" ON gathering_responses
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Gathering responses can be deleted by the user" ON gathering_responses
    FOR DELETE USING (user_id = auth.uid());

-- Step 10: Re-enable RLS for community_memberships
ALTER TABLE community_memberships ENABLE ROW LEVEL SECURITY;