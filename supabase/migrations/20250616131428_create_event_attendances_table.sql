/*
  # Create event_attendances table

  1. New Tables
    - `event_attendances`
      - `id` (uuid, primary key)
      - `event_id` (uuid, references events.id)
      - `user_id` (uuid, references auth.users.id)
      - `status` (text, enum: attending/not_attending/maybe)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `event_attendances` table
    - Users can only manage their own attendance
    - Everyone can view attendances (for attendee lists)

  3. Constraints
    - Unique constraint on (event_id, user_id) - one attendance per user per event
    - Valid status values

  4. Triggers
    - Update attendee_count on events table when attendances change
    - Auto-update updated_at timestamp

  5. Indexes
    - Event and user lookups
    - Status filtering
*/

-- Create event_attendances table
CREATE TABLE IF NOT EXISTS event_attendances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('attending', 'not_attending', 'maybe')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint: one attendance record per user per event
  CONSTRAINT event_attendances_unique_user_event UNIQUE (event_id, user_id)
);

-- Enable RLS
ALTER TABLE event_attendances ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Event attendances are viewable by everyone"
  ON event_attendances
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can manage their own event attendance"
  ON event_attendances
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX event_attendances_event_id_idx ON event_attendances(event_id);
CREATE INDEX event_attendances_user_id_idx ON event_attendances(user_id);
CREATE INDEX event_attendances_status_idx ON event_attendances(status);
CREATE INDEX event_attendances_created_at_idx ON event_attendances(created_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_event_attendances_updated_at
  BEFORE UPDATE ON event_attendances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update event attendee count
CREATE OR REPLACE FUNCTION update_event_attendee_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT and UPDATE cases
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE events 
    SET attendee_count = (
      SELECT COUNT(*) 
      FROM event_attendances 
      WHERE event_id = NEW.event_id 
      AND status = 'attending'
    ),
    updated_at = now()
    WHERE id = NEW.event_id;
    RETURN NEW;
  END IF;

  -- Handle DELETE case
  IF TG_OP = 'DELETE' THEN
    UPDATE events 
    SET attendee_count = (
      SELECT COUNT(*) 
      FROM event_attendances 
      WHERE event_id = OLD.event_id 
      AND status = 'attending'
    ),
    updated_at = now()
    WHERE id = OLD.event_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ language 'plpgsql';

-- Create triggers to maintain attendee count
CREATE TRIGGER update_event_attendee_count_on_insert
  AFTER INSERT ON event_attendances
  FOR EACH ROW
  EXECUTE FUNCTION update_event_attendee_count();

CREATE TRIGGER update_event_attendee_count_on_update
  AFTER UPDATE ON event_attendances
  FOR EACH ROW
  EXECUTE FUNCTION update_event_attendee_count();

CREATE TRIGGER update_event_attendee_count_on_delete
  AFTER DELETE ON event_attendances
  FOR EACH ROW
  EXECUTE FUNCTION update_event_attendee_count();