-- Update get_connection_details function to use public_profiles view
-- and return all UserSummary fields (first_name, last_name, full_name, avatar_url)

-- Drop existing function first since we're changing the return type
DROP FUNCTION IF EXISTS get_connection_details(TEXT);

CREATE OR REPLACE FUNCTION get_connection_details(connection_code TEXT)
RETURNS TABLE (
  user_id UUID,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  avatar_url TEXT,
  community_id UUID,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pp.id as user_id,
    pp.first_name,
    pp.last_name,
    pp.full_name,
    pp.avatar_url,
    cmc.community_id,
    cmc.is_active,
    cmc.created_at
  FROM public_profiles pp
  INNER JOIN community_member_codes cmc ON pp.id = cmc.user_id
  WHERE cmc.code = connection_code
    AND cmc.is_active = true;
END;
$$;