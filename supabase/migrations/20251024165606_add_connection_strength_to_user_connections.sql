-- Add connection strength to user_connections table
-- This allows users to indicate their trust level with connections

-- Create enum type for connection strength
CREATE TYPE connection_strength AS ENUM (
  'trusted',    -- "I know and trust them well"
  'positive',   -- "Don't know them well but seems trustworthy"
  'neutral',    -- "Don't know them well enough to say" / "No strong opinion"
  'negative',   -- "Had a bad experience / don't trust them"
  'unknown'     -- "Don't know them at all"
);

-- Add strength column to user_connections table
-- Defaults to NULL (not answered)
ALTER TABLE user_connections
ADD COLUMN strength connection_strength;

-- Add comment for documentation
COMMENT ON COLUMN user_connections.strength IS 'Trust level assessment from user_id about other_id. NULL means not yet answered.';
