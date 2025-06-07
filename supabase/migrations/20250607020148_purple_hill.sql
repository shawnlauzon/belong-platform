/*
  # Add state level to communities hierarchy

  1. Changes
    - Add state level between country and city in the hierarchy
    - Update existing Austin city to have Texas state as parent
    - Create Texas state community

  2. Security
    - No changes to RLS policies
    - Maintains existing security model
*/

-- Insert Texas state between US and Austin
DO $$
DECLARE
  us_id uuid := '01936b3a-0001-7000-8000-000000000002';
  texas_id uuid := '01936b3a-0007-7000-8000-000000000007';
  austin_id uuid := '01936b3a-0003-7000-8000-000000000004';
BEGIN
  -- Insert Texas state
  INSERT INTO communities (
    id,
    name,
    level,
    parent_id,
    description,
    member_count,
    creator_id
  ) VALUES (
    texas_id,
    'Texas',
    'state',
    us_id,
    'Lone Star State communities',
    5600,
    NULL
  ) ON CONFLICT (id) DO NOTHING;

  -- Update Austin to have Texas as parent instead of US
  UPDATE communities 
  SET parent_id = texas_id
  WHERE id = austin_id;
END $$;