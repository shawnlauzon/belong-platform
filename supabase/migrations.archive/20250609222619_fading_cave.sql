/*
  # Create thanks table for gratitude system

  1. New Tables
    - `thanks`
      - `id` (uuid, primary key)
      - `from_user_id` (uuid, references profiles.id)
      - `to_user_id` (uuid, references profiles.id)
      - `resource_id` (uuid, references resources.id)
      - `message` (text, not null)
      - `image_urls` (text array, default empty)
      - `impact_description` (text, optional)
      - `created_at` (timestamptz, default now)

  2. Security
    - Enable RLS on `thanks` table
    - Add policies for:
      - Public read access to all thanks
      - Authenticated users can create thanks (only their own)
      - Users can update their own thanks
      - Users can delete their own thanks

  3. Constraints
    - Ensure from_user_id and to_user_id are different
    - Minimum message length of 5 characters
*/

-- Create thanks table
CREATE TABLE IF NOT EXISTS thanks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES profiles(id),
  to_user_id uuid NOT NULL REFERENCES profiles(id),
  resource_id uuid NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  message text NOT NULL,
  image_urls text[] NOT NULL DEFAULT '{}',
  impact_description text,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT thanks_different_users CHECK (from_user_id <> to_user_id),
  CONSTRAINT thanks_message_min_length CHECK (char_length(message) >= 5)
);

-- Enable RLS
ALTER TABLE thanks ENABLE ROW LEVEL SECURITY;

-- Create policies (drop existing ones first to handle re-runs)
DROP POLICY IF EXISTS "Thanks are viewable by everyone" ON thanks;
CREATE POLICY "Thanks are viewable by everyone"
  ON thanks
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create thanks" ON thanks;
CREATE POLICY "Authenticated users can create thanks"
  ON thanks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = from_user_id);

DROP POLICY IF EXISTS "Users can update their own thanks" ON thanks;
CREATE POLICY "Users can update their own thanks"
  ON thanks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = from_user_id)
  WITH CHECK (auth.uid() = from_user_id);

DROP POLICY IF EXISTS "Users can delete their own thanks" ON thanks;
CREATE POLICY "Users can delete their own thanks"
  ON thanks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = from_user_id);

-- Create indexes for better performance (drop existing ones first to handle re-runs)
DROP INDEX IF EXISTS thanks_from_user_id_idx;
CREATE INDEX thanks_from_user_id_idx ON thanks(from_user_id);

DROP INDEX IF EXISTS thanks_to_user_id_idx;
CREATE INDEX thanks_to_user_id_idx ON thanks(to_user_id);

DROP INDEX IF EXISTS thanks_resource_id_idx;
CREATE INDEX thanks_resource_id_idx ON thanks(resource_id);

DROP INDEX IF EXISTS thanks_created_at_idx;
CREATE INDEX thanks_created_at_idx ON thanks(created_at DESC);