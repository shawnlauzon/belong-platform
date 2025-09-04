-- Fix cascade delete issues in trigger functions
-- When a community is deleted, triggers should gracefully handle the cascade

-- Update notify_on_membership_leave to check if community exists
CREATE OR REPLACE FUNCTION notify_on_membership_leave() RETURNS TRIGGER AS $function$
BEGIN
  -- Check if community still exists (handles cascade delete case)
  IF NOT EXISTS (SELECT 1 FROM communities WHERE id = OLD.community_id) THEN
    -- Community was deleted, skip notification
    RETURN OLD;
  END IF;
  
  -- Notify community organizers when someone leaves
  INSERT INTO notifications (user_id, type, actor_id, title, body, community_id, metadata, created_at, updated_at)
  SELECT 
    cm.user_id,
    'community_member_left',
    OLD.user_id,
    'Member left community',
    'Someone left your community.',
    OLD.community_id,
    jsonb_build_object('community_id', OLD.community_id, 'member_id', OLD.user_id),
    NOW(),
    NOW()
  FROM community_memberships cm
  WHERE cm.community_id = OLD.community_id
    AND cm.role = 'organizer'
    AND cm.user_id != OLD.user_id; -- Don't notify the person who left
  
  RETURN OLD;
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trust_score_on_membership_delete to check if community exists
CREATE OR REPLACE FUNCTION trust_score_on_membership_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Check if community still exists (handles cascade delete case)
  IF NOT EXISTS (SELECT 1 FROM communities WHERE id = OLD.community_id) THEN
    -- Community was deleted, skip trust score penalty
    RETURN OLD;
  END IF;
  
  -- Only deduct points for voluntary leaves, not cascade deletes
  PERFORM update_trust_score(
    OLD.user_id,
    OLD.community_id,
    'community_leave'::trust_score_action_type,
    OLD.community_id,
    -50,
    jsonb_build_object('trigger', 'community_membership_delete')
  );
  
  RETURN OLD;
END;
$function$;

-- Update update_community_member_count to check if community exists
CREATE OR REPLACE FUNCTION update_community_member_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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

  -- Check if community still exists (handles cascade delete case)
  IF NOT EXISTS (SELECT 1 FROM communities WHERE id = target_community_id) THEN
    -- Community was deleted, skip member count update
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
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
$function$;