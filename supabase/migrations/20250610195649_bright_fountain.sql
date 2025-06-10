/*
  # Create function to update community member count

  1. New Functions
    - `update_community_member_count()` - Updates member_count based on community_memberships

  2. Functionality
    - Counts actual members in community_memberships table
    - Updates the member_count column in communities table
    - Handles both increments and decrements automatically
    - Uses SECURITY DEFINER for proper permissions
*/

-- Create function to update community member count
CREATE OR REPLACE FUNCTION update_community_member_count()
RETURNS TRIGGER AS $$
DECLARE
  target_community_id uuid;
  new_count integer;
BEGIN
  -- Determine which community_id to update based on the operation
  IF TG_OP = 'DELETE' THEN
    target_community_id := OLD.community_id;
  ELSE
    target_community_id := NEW.community_id;
  END IF;

  -- Count the actual number of members for this community
  SELECT COUNT(*)
  INTO new_count
  FROM community_memberships
  WHERE community_id = target_community_id;

  -- Update the member_count in the communities table
  UPDATE communities
  SET member_count = new_count,
      updated_at = now()
  WHERE id = target_community_id;

  -- Return the appropriate record based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;