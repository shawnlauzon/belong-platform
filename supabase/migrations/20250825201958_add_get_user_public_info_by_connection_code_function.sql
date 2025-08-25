-- Create function to get connection details by connection code
-- This allows looking up connection information including user details and community info
-- using their member connection code without requiring authentication

CREATE OR REPLACE FUNCTION get_connection_details(connection_code TEXT)
RETURNS TABLE (
  user_id UUID,
  first_name TEXT,
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
    p.id as user_id,
    (p.user_metadata->>'first_name')::TEXT as first_name,
    (p.user_metadata->>'avatar_url')::TEXT as avatar_url,
    cmc.community_id,
    cmc.is_active,
    cmc.created_at
  FROM profiles p
  INNER JOIN community_member_codes cmc ON p.id = cmc.user_id
  WHERE cmc.code = connection_code
    AND cmc.is_active = true;
END;
$$;