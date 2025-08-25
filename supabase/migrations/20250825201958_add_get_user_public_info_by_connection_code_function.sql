-- Create function to get user public info by connection code
-- This allows looking up user public information using their member connection code
-- without requiring authentication, useful for public user discovery

CREATE OR REPLACE FUNCTION get_user_public_info_by_connection_code(connection_code TEXT)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    (p.user_metadata->>'first_name')::TEXT as first_name,
    (p.user_metadata->>'avatar_url')::TEXT as avatar_url
  FROM profiles p
  INNER JOIN community_member_codes cmc ON p.id = cmc.user_id
  WHERE cmc.code = connection_code
    AND cmc.is_active = true;
END;
$$;