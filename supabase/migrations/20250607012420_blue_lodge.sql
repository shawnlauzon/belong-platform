/*
  # Create communities table

  1. New Tables
    - `communities`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `level` (text, enum: neighborhood/city/state/country/global)
      - `parent_id` (uuid, references communities.id)
      - `description` (text, required)
      - `center` (geometry point, optional)
      - `radius_km` (numeric, optional)
      - `member_count` (integer, default 1)
      - `creator_id` (uuid, references auth.users.id)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `communities` table
    - Add policies for public read access
    - Add policies for authenticated users to create communities
    - Add policies for creators to update their communities

  3. Indexes
    - Index on parent_id for hierarchy queries
    - Index on level for filtering
    - Spatial index on center for location queries
    - Index on creator_id for user's communities
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

-- Insert default worldwide community
INSERT INTO communities (
  id,
  name,
  level,
  parent_id,
  description,
  member_count,
  creator_id
) VALUES (
  'worldwide',
  'Worldwide',
  'global',
  NULL,
  'Global neighborhood connecting communities worldwide',
  125000,
  NULL
) ON CONFLICT (id) DO NOTHING;

-- Insert default countries
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
    'us',
    'United States',
    'country',
    'worldwide',
    'Coast to coast community',
    45000,
    NULL
  ),
  (
    'england',
    'England',
    'country',
    'worldwide',
    'English communities',
    8500,
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- Insert default cities
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
    'austin',
    'Austin',
    'city',
    'us',
    'Keep Austin helping',
    ST_SetSRID(ST_MakePoint(-97.7431, 30.2672), 4326),
    25,
    1240,
    NULL
  ),
  (
    'guildford',
    'Guildford',
    'city',
    'england',
    'Guildford community',
    ST_SetSRID(ST_MakePoint(-0.5704, 51.2362), 4326),
    15,
    320,
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- Insert default neighborhoods
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
  'south-austin',
  'South Austin',
  'neighborhood',
  'austin',
  'South Austin neighbors helping neighbors',
  ST_SetSRID(ST_MakePoint(-97.7500, 30.2500), 4326),
  8,
  145,
  NULL
) ON CONFLICT (id) DO NOTHING;