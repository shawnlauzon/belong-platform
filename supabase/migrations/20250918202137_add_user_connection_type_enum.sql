-- Add User Connection Type Enum Migration
-- Convert user_connections.type from TEXT with CHECK constraint to proper enum type

-- =====================================================
-- CREATE USER CONNECTION TYPE ENUM
-- =====================================================

-- Create enum type for user connection types
CREATE TYPE user_connection_type AS ENUM ('invited_by');

-- =====================================================
-- UPDATE USER_CONNECTIONS TABLE
-- =====================================================

-- Drop existing check constraint on user_connections.type
ALTER TABLE user_connections DROP CONSTRAINT IF EXISTS user_connections_type_check;

-- Convert the type column to use the new enum
-- First remove the default
ALTER TABLE user_connections ALTER COLUMN type DROP DEFAULT;

-- Convert the column type
ALTER TABLE user_connections
  ALTER COLUMN type SET DATA TYPE user_connection_type
  USING type::user_connection_type;

-- Set the new default using the enum
ALTER TABLE user_connections ALTER COLUMN type SET DEFAULT 'invited_by'::user_connection_type;

-- =====================================================
-- UPDATE FUNCTIONS TO USE ENUM TYPE
-- =====================================================

-- Update the create_user_connection function to explicitly use the enum type
CREATE OR REPLACE FUNCTION create_user_connection(
  p_user_id UUID,
  p_other_id UUID,
  p_community_id UUID
) RETURNS UUID AS $$
DECLARE
  connection_id UUID;
BEGIN
  -- Create the connection record
  INSERT INTO user_connections (
    user_id,
    other_id,
    community_id,
    type
  ) VALUES (
    p_user_id,
    p_other_id,
    p_community_id,
    'invited_by'::user_connection_type
  )
  ON CONFLICT (community_id, user_id, other_id) DO NOTHING
  RETURNING id INTO connection_id;

  RETURN connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;