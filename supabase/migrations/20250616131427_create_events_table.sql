/*
  # Create events table

  1. New Tables
    - `events`
      - `id` (uuid, primary key)
      - `title` (text, not null)
      - `description` (text, not null)
      - `organizer_id` (uuid, references auth.users.id)
      - `community_id` (uuid, references communities.id)
      - `start_date_time` (timestamptz, not null)
      - `end_date_time` (timestamptz, nullable)
      - `location` (text, not null)
      - `coordinates` (geometry point, not null)
      - `parking_info` (text, nullable)
      - `max_attendees` (integer, nullable)
      - `registration_required` (boolean, default false)
      - `is_active` (boolean, default true)
      - `tags` (text[], default empty array)
      - `image_urls` (text[], default empty array)
      - `attendee_count` (integer, default 0)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `events` table
    - Add policies for public read, authenticated create
    - Organizers can update/delete their own events

  3. Indexes
    - Location-based searches
    - Community and organizer lookups
    - Date-based filtering
*/

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  organizer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  start_date_time timestamptz NOT NULL,
  end_date_time timestamptz,
  location text NOT NULL,
  coordinates geometry(Point, 4326) NOT NULL,
  parking_info text,
  max_attendees integer,
  registration_required boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  tags text[] NOT NULL DEFAULT '{}',
  image_urls text[] NOT NULL DEFAULT '{}',
  attendee_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT events_title_min_length CHECK (char_length(title) >= 3),
  CONSTRAINT events_description_min_length CHECK (char_length(description) >= 10),
  CONSTRAINT events_max_attendees_positive CHECK (max_attendees IS NULL OR max_attendees > 0),
  CONSTRAINT events_end_after_start CHECK (end_date_time IS NULL OR end_date_time > start_date_time),
  CONSTRAINT events_attendee_count_non_negative CHECK (attendee_count >= 0)
);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Events are viewable by everyone"
  ON events
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizers can update their events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = organizer_id)
  WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizers can delete their events"
  ON events
  FOR DELETE
  TO authenticated
  USING (auth.uid() = organizer_id);

-- Create indexes
CREATE INDEX events_organizer_id_idx ON events(organizer_id);
CREATE INDEX events_community_id_idx ON events(community_id);
CREATE INDEX events_start_date_time_idx ON events(start_date_time);
CREATE INDEX events_coordinates_idx ON events USING gist(coordinates);
CREATE INDEX events_is_active_idx ON events(is_active);
CREATE INDEX events_tags_idx ON events USING gin(tags);
CREATE INDEX events_created_at_idx ON events(created_at DESC);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();