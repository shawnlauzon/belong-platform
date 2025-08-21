/*
  # Create communities table with hierarchical structure

  1. New Tables
    - `communities`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `level` (text, enum: neighborhood/city/state/country/global)
      - `parent_id` (uuid, references communities.id)
      - `description` (text, not null)
      - `center` (geometry point for location)
      - `radius_km` (numeric for area coverage)
      - `member_count` (integer, default 1)
      - `creator_id` (uuid, references auth.users.id)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `communities` table
    - Add policies for public read, authenticated create/update
    - Creators can only update their own communities

  3. Default Data
    - Insert worldwide → countries → cities → neighborhoods hierarchy
    - Uses proper UUIDs for all entries
*/

-- Create communities table
CREATE TABLE IF NOT EXISTS communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  level text NOT NULL CHECK (level IN ('neighborhood', 'city', 'state', 'country', 'global')),
  parent_id uuid REFERENCES communities(id) ON DELETE CASCADE,
  description text NOT NULL,
  center geometry(Point, 4326),
  radius_km numeric,
  member_count integer NOT NULL DEFAULT 1,
  creator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT communities_name_min_length CHECK (char_length(name) >= 2),
  CONSTRAINT communities_description_min_length CHECK (char_length(description) >= 10),
  CONSTRAINT communities_radius_positive CHECK (radius_km IS NULL OR radius_km > 0)
);

-- Enable RLS
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Communities are viewable by everyone"
  ON communities
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create communities"
  ON communities
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their communities"
  ON communities
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- Create indexes
CREATE INDEX communities_parent_id_idx ON communities(parent_id);
CREATE INDEX communities_level_idx ON communities(level);
CREATE INDEX communities_creator_id_idx ON communities(creator_id);
CREATE INDEX communities_center_idx ON communities USING gist(center);
CREATE INDEX communities_created_at_idx ON communities(created_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_communities_updated_at
  BEFORE UPDATE ON communities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default communities with proper UUIDs
DO $$
DECLARE
  worldwide_id uuid := '00000000-0000-0000-0000-000000000001';
  us_id uuid := '00000000-0000-0000-0000-000000000002';
  england_id uuid := '00000000-0000-0000-0000-000000000003';
  austin_id uuid := '00000000-0000-0000-0000-000000000004';
  guildford_id uuid := '00000000-0000-0000-0000-000000000005';
  south_austin_id uuid := '00000000-0000-0000-0000-000000000006';
BEGIN
  -- Insert worldwide community
  INSERT INTO communities (
    id,
    name,
    level,
    parent_id,
    description,
    member_count,
    creator_id
  ) VALUES (
    worldwide_id,
    'Worldwide',
    'global',
    NULL,
    'Global neighborhood connecting communities worldwide',
    125000,
    NULL
  ) ON CONFLICT (id) DO NOTHING;

  -- Insert countries
  INSERT INTO communities (
    id,
    name,
    level,
    parent_id,
    description,
    member_count,
    creator_id
  ) VALUES 
    (
      us_id,
      'United States',
      'country',
      worldwide_id,
      'Coast to coast community',
      45000,
      NULL
    ),
    (
      england_id,
      'England',
      'country',
      worldwide_id,
      'English communities',
      8500,
      NULL
    )
  ON CONFLICT (id) DO NOTHING;

  -- Insert cities
  INSERT INTO communities (
    id,
    name,
    level,
    parent_id,
    description,
    center,
    radius_km,
    member_count,
    creator_id
  ) VALUES 
    (
      austin_id,
      'Austin',
      'city',
      us_id,
      'Keep Austin helping',
      ST_SetSRID(ST_MakePoint(-97.7431, 30.2672), 4326),
      25,
      1240,
      NULL
    ),
    (
      guildford_id,
      'Guildford',
      'city',
      england_id,
      'Guildford community',
      ST_SetSRID(ST_MakePoint(-0.5704, 51.2362), 4326),
      15,
      320,
      NULL
    )
  ON CONFLICT (id) DO NOTHING;

  -- Insert neighborhoods
  INSERT INTO communities (
    id,
    name,
    level,
    parent_id,
    description,
    center,
    radius_km,
    member_count,
    creator_id
  ) VALUES (
    south_austin_id,
    'South Austin',
    'neighborhood',
    austin_id,
    'South Austin neighbors helping neighbors',
    ST_SetSRID(ST_MakePoint(-97.7500, 30.2500), 4326),
    8,
    145,
    NULL
  ) ON CONFLICT (id) DO NOTHING;
END $$;