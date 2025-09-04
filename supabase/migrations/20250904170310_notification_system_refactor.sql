-- Notification System Refactor
-- This migration refactors the notification system to improve type safety,
-- remove redundant data, and provide specialized functions for each notification type.

-- ============================================================================
-- STEP 1: ALTER NOTIFICATIONS TABLE - Add new columns
-- ============================================================================

-- Add new foreign key columns for shoutouts
-- Note: Using separate ALTER statements to avoid issues with foreign key constraints
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS shoutout_id UUID;

-- Note: trust_scores doesn't have an id column, uses composite key (user_id, community_id)
-- So we'll use the existing community_id column for trust score notifications

-- Add foreign key constraints
ALTER TABLE notifications
ADD CONSTRAINT fk_notifications_shoutout
FOREIGN KEY (shoutout_id) REFERENCES shoutouts(id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 2: CREATE NOTIFICATION_DETAILS VIEW
-- ============================================================================

-- Drop view if exists for clean recreation
DROP VIEW IF EXISTS notification_details;

CREATE VIEW notification_details AS
SELECT 
  n.id,
  n.user_id,
  n.type,
  n.actor_id,
  n.is_read,
  n.read_at,
  n.created_at,
  n.updated_at,
  
  -- Actor details
  actor.full_name as actor_name,
  actor.avatar_url as actor_avatar,
  
  -- Resource details (when applicable)
  r.id as resource_id,
  r.title as resource_title,
  r.type as resource_type,
  r.status as resource_status,
  r.owner_id as resource_owner_id,
  r.location_name as resource_location,
  
  -- Comment details (when applicable)
  c.id as comment_id,
  c.content as comment_content,
  c.parent_id as comment_parent_id,
  
  -- Claim details (when applicable)
  rc.id as claim_id,
  rc.status as claim_status,
  rc.claimant_id as claim_claimant_id,
  
  -- Community details (when applicable)
  com.id as community_id,
  com.name as community_name,
  com.type as community_type,
  
  -- Shoutout details (when applicable)
  s.id as shoutout_id,
  s.message as shoutout_message,
  s.sender_id as shoutout_sender_id,
  s.receiver_id as shoutout_receiver_id,
  
  -- Trust score details (when applicable - using community_id to link)
  ts.score as trust_score,
  ts.last_calculated_at as trust_score_calculated_at,
  
  -- Keep metadata for now (may contain useful information)
  n.metadata

FROM notifications n
LEFT JOIN public_profiles actor ON n.actor_id = actor.id
LEFT JOIN resources r ON n.resource_id = r.id
LEFT JOIN comments c ON n.comment_id = c.id
LEFT JOIN resource_claims rc ON n.claim_id = rc.id
LEFT JOIN communities com ON n.community_id = com.id
LEFT JOIN shoutouts s ON n.shoutout_id = s.id
LEFT JOIN trust_scores ts ON n.user_id = ts.user_id AND n.community_id = ts.community_id AND n.type IN ('trust_points_received', 'trust_level_changed');

-- Grant permissions
GRANT SELECT ON notification_details TO authenticated;
GRANT SELECT ON notification_details TO service_role;

-- ============================================================================
-- STEP 3: CREATE BASE NOTIFICATION FUNCTION
-- ============================================================================

-- Internal base function for creating notifications
CREATE OR REPLACE FUNCTION create_notification_base(
  p_user_id UUID,
  p_type TEXT,
  p_actor_id UUID DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_comment_id UUID DEFAULT NULL,
  p_claim_id UUID DEFAULT NULL,
  p_community_id UUID DEFAULT NULL,
  p_shoutout_id UUID DEFAULT NULL
  -- Removed p_trust_score_id as trust_scores uses composite key
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  -- Check notification preferences
  IF NOT should_send_notification(p_user_id, p_type) THEN
    RETURN NULL;
  END IF;
  
  -- Insert notification with only relevant foreign keys
  INSERT INTO notifications (
    user_id, type, actor_id,
    resource_id, comment_id, claim_id, 
    community_id, shoutout_id,
    created_at, updated_at
  ) VALUES (
    p_user_id, p_type, p_actor_id,
    p_resource_id, p_comment_id, p_claim_id,
    p_community_id, p_shoutout_id,
    NOW(), NOW()
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- ============================================================================
-- STEP 4: CREATE SPECIALIZED NOTIFICATION FUNCTIONS
-- ============================================================================

-- Comment notifications
CREATE OR REPLACE FUNCTION notify_comment(
  p_user_id UUID,
  p_actor_id UUID, 
  p_resource_id UUID,
  p_comment_id UUID,
  p_community_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN create_notification_base(
    p_user_id := p_user_id,
    p_type := 'comment',
    p_actor_id := p_actor_id,
    p_resource_id := p_resource_id,
    p_comment_id := p_comment_id,
    p_community_id := p_community_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION notify_comment_reply(
  p_user_id UUID,
  p_actor_id UUID,
  p_resource_id UUID,
  p_comment_id UUID,
  p_parent_comment_id UUID,
  p_community_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN create_notification_base(
    p_user_id := p_user_id,
    p_type := 'comment_reply',
    p_actor_id := p_actor_id,
    p_resource_id := p_resource_id,
    p_comment_id := p_comment_id,
    p_community_id := p_community_id
  );
END;
$$;

-- Resource notifications
CREATE OR REPLACE FUNCTION notify_new_resource(
  p_user_id UUID,
  p_actor_id UUID,
  p_resource_id UUID,
  p_community_id UUID,
  p_resource_type resource_type
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  notification_type TEXT;
BEGIN
  -- Determine notification type based on resource type
  IF p_resource_type = 'event' THEN
    notification_type := 'new_event';
  ELSE
    notification_type := 'new_resource';
  END IF;
  
  RETURN create_notification_base(
    p_user_id := p_user_id,
    p_type := notification_type,
    p_actor_id := p_actor_id,
    p_resource_id := p_resource_id,
    p_community_id := p_community_id
  );
END;
$$;

-- Claim notifications
CREATE OR REPLACE FUNCTION notify_claim(
  p_user_id UUID,
  p_actor_id UUID,
  p_resource_id UUID,
  p_claim_id UUID,
  p_community_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN create_notification_base(
    p_user_id := p_user_id,
    p_type := 'claim',
    p_actor_id := p_actor_id,
    p_resource_id := p_resource_id,
    p_claim_id := p_claim_id,
    p_community_id := p_community_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION notify_claim_approved(
  p_user_id UUID,
  p_actor_id UUID,
  p_resource_id UUID,
  p_claim_id UUID,
  p_community_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN create_notification_base(
    p_user_id := p_user_id,
    p_type := 'claim_approved',
    p_actor_id := p_actor_id,
    p_resource_id := p_resource_id,
    p_claim_id := p_claim_id,
    p_community_id := p_community_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION notify_claim_rejected(
  p_user_id UUID,
  p_actor_id UUID,
  p_resource_id UUID,
  p_claim_id UUID,
  p_community_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN create_notification_base(
    p_user_id := p_user_id,
    p_type := 'claim_rejected',
    p_actor_id := p_actor_id,
    p_resource_id := p_resource_id,
    p_claim_id := p_claim_id,
    p_community_id := p_community_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION notify_claim_completed(
  p_user_id UUID,
  p_actor_id UUID,
  p_resource_id UUID,
  p_claim_id UUID,
  p_community_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN create_notification_base(
    p_user_id := p_user_id,
    p_type := 'resource_claim_completed',
    p_actor_id := p_actor_id,
    p_resource_id := p_resource_id,
    p_claim_id := p_claim_id,
    p_community_id := p_community_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION notify_claim_cancelled(
  p_user_id UUID,
  p_actor_id UUID,
  p_resource_id UUID,
  p_claim_id UUID,
  p_community_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN create_notification_base(
    p_user_id := p_user_id,
    p_type := 'resource_claim_cancelled',
    p_actor_id := p_actor_id,
    p_resource_id := p_resource_id,
    p_claim_id := p_claim_id,
    p_community_id := p_community_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION notify_resource_updated(
  p_user_id UUID,
  p_actor_id UUID,
  p_resource_id UUID,
  p_claim_id UUID DEFAULT NULL,
  p_community_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN create_notification_base(
    p_user_id := p_user_id,
    p_type := 'claimed_resource_updated',
    p_actor_id := p_actor_id,
    p_resource_id := p_resource_id,
    p_claim_id := p_claim_id,
    p_community_id := p_community_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION notify_resource_cancelled(
  p_user_id UUID,
  p_actor_id UUID,
  p_resource_id UUID,
  p_community_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN create_notification_base(
    p_user_id := p_user_id,
    p_type := 'claimed_resource_cancelled',
    p_actor_id := p_actor_id,
    p_resource_id := p_resource_id,
    p_community_id := p_community_id
  );
END;
$$;

-- Community notifications
CREATE OR REPLACE FUNCTION notify_community_member_joined(
  p_user_id UUID,
  p_actor_id UUID,
  p_community_id UUID
) RETURNS UUID
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN create_notification_base(
    p_user_id := p_user_id,
    p_type := 'community_member_joined',
    p_actor_id := p_actor_id,
    p_community_id := p_community_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION notify_community_member_left(
  p_user_id UUID,
  p_actor_id UUID,
  p_community_id UUID
) RETURNS UUID
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN create_notification_base(
    p_user_id := p_user_id,
    p_type := 'community_member_left',
    p_actor_id := p_actor_id,
    p_community_id := p_community_id
  );
END;
$$;

-- Social notifications
CREATE OR REPLACE FUNCTION notify_shoutout(
  p_user_id UUID,
  p_actor_id UUID,
  p_shoutout_id UUID,
  p_community_id UUID
) RETURNS UUID
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN create_notification_base(
    p_user_id := p_user_id,
    p_type := 'shoutout_received',
    p_actor_id := p_actor_id,
    p_shoutout_id := p_shoutout_id,
    p_community_id := p_community_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION notify_connection_request(
  p_user_id UUID,
  p_actor_id UUID
) RETURNS UUID
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN create_notification_base(
    p_user_id := p_user_id,
    p_type := 'connection_request',
    p_actor_id := p_actor_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION notify_connection_accepted(
  p_user_id UUID,
  p_actor_id UUID
) RETURNS UUID
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN create_notification_base(
    p_user_id := p_user_id,
    p_type := 'connection_accepted',
    p_actor_id := p_actor_id
  );
END;
$$;

-- Trust notifications
CREATE OR REPLACE FUNCTION notify_trust_points(
  p_user_id UUID,
  p_community_id UUID
) RETURNS UUID
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN create_notification_base(
    p_user_id := p_user_id,
    p_type := 'trust_points_received',
    p_community_id := p_community_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION notify_trust_level_change(
  p_user_id UUID,
  p_community_id UUID
) RETURNS UUID
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN create_notification_base(
    p_user_id := p_user_id,
    p_type := 'trust_level_changed',
    p_community_id := p_community_id
  );
END;
$$;

-- ============================================================================
-- STEP 5: UPDATE TRIGGER FUNCTIONS TO USE SPECIALIZED FUNCTIONS
-- ============================================================================

-- Update comment notification trigger
CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  resource_owner_id UUID;
  parent_comment_author_id UUID;
  resource_community_id UUID;
BEGIN
  -- Get resource owner and community
  SELECT owner_id INTO resource_owner_id
  FROM resources
  WHERE id = NEW.resource_id;
  
  -- Get community if resource is in one
  SELECT community_id INTO resource_community_id
  FROM resource_communities
  WHERE resource_id = NEW.resource_id
  LIMIT 1;
  
  -- If this is a reply to another comment, get the parent comment author
  IF NEW.parent_id IS NOT NULL THEN
    SELECT author_id INTO parent_comment_author_id
    FROM comments
    WHERE id = NEW.parent_id;
    
    -- Notify parent comment author if they're not the commenter
    IF parent_comment_author_id IS NOT NULL AND parent_comment_author_id != NEW.author_id THEN
      PERFORM notify_comment_reply(
        parent_comment_author_id,
        NEW.author_id,
        NEW.resource_id,
        NEW.id,
        NEW.parent_id,
        resource_community_id
      );
    END IF;
  END IF;
  
  -- Notify resource owner if they're not the commenter and not already notified as parent author
  IF resource_owner_id IS NOT NULL 
     AND resource_owner_id != NEW.author_id
     AND (parent_comment_author_id IS NULL OR resource_owner_id != parent_comment_author_id) THEN
    PERFORM notify_comment(
      resource_owner_id,
      NEW.author_id,
      NEW.resource_id,
      NEW.id,
      resource_community_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update claim notification trigger
CREATE OR REPLACE FUNCTION notify_on_claim()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  resource_owner_id UUID;
  resource_community_id UUID;
BEGIN
  -- Get resource owner
  SELECT owner_id INTO resource_owner_id
  FROM resources
  WHERE id = NEW.resource_id;
  
  -- Get community if resource is in one
  SELECT community_id INTO resource_community_id
  FROM resource_communities
  WHERE resource_id = NEW.resource_id
  LIMIT 1;
  
  -- Notify resource owner about new claim
  IF resource_owner_id IS NOT NULL AND resource_owner_id != NEW.claimant_id THEN
    PERFORM notify_claim(
      resource_owner_id,
      NEW.claimant_id,
      NEW.resource_id,
      NEW.id,
      resource_community_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update claim status change notification trigger
CREATE OR REPLACE FUNCTION notify_on_claim_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  resource_owner_id UUID;
  resource_community_id UUID;
BEGIN
  -- Only proceed if status actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get resource owner
  SELECT owner_id INTO resource_owner_id
  FROM resources
  WHERE id = NEW.resource_id;
  
  -- Get community if resource is in one
  SELECT community_id INTO resource_community_id
  FROM resource_communities
  WHERE resource_id = NEW.resource_id
  LIMIT 1;
  
  -- Handle different status changes
  CASE NEW.status
    WHEN 'approved' THEN
      -- Notify claimant their claim was approved
      PERFORM notify_claim_approved(
        NEW.claimant_id,
        resource_owner_id,
        NEW.resource_id,
        NEW.id,
        resource_community_id
      );
      
    WHEN 'rejected' THEN
      -- Notify claimant their claim was rejected
      PERFORM notify_claim_rejected(
        NEW.claimant_id,
        resource_owner_id,
        NEW.resource_id,
        NEW.id,
        resource_community_id
      );
      
    WHEN 'completed' THEN
      -- Notify resource owner the claim was completed
      IF resource_owner_id != NEW.claimant_id THEN
        PERFORM notify_claim_completed(
          resource_owner_id,
          NEW.claimant_id,
          NEW.resource_id,
          NEW.id,
          resource_community_id
        );
      END IF;
      
    WHEN 'cancelled' THEN
      -- Notify resource owner the claim was cancelled
      IF resource_owner_id != NEW.claimant_id THEN
        PERFORM notify_claim_cancelled(
          resource_owner_id,
          NEW.claimant_id,
          NEW.resource_id,
          NEW.id,
          resource_community_id
        );
      END IF;
      
    ELSE
      -- Do nothing for other statuses
      NULL;
  END CASE;
  
  RETURN NEW;
END;
$$;

-- Update resource update notification trigger
CREATE OR REPLACE FUNCTION notify_on_resource_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  claim_record RECORD;
  resource_community_id UUID;
BEGIN
  -- Only notify if specific fields changed
  IF OLD.title = NEW.title 
     AND OLD.description = NEW.description
     AND OLD.location_name IS NOT DISTINCT FROM NEW.location_name THEN
    RETURN NEW;
  END IF;
  
  -- Get community if resource is in one
  SELECT community_id INTO resource_community_id
  FROM resource_communities
  WHERE resource_id = NEW.id
  LIMIT 1;
  
  -- Notify all approved claimants about resource update
  FOR claim_record IN 
    SELECT id, claimant_id 
    FROM resource_claims 
    WHERE resource_id = NEW.id 
      AND status = 'approved'
      AND claimant_id != NEW.owner_id
  LOOP
    PERFORM notify_resource_updated(
      claim_record.claimant_id,
      NEW.owner_id,
      NEW.id,
      claim_record.id,
      resource_community_id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Update resource cancellation notification trigger
CREATE OR REPLACE FUNCTION notify_on_resource_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  claim_record RECORD;
  resource_community_id UUID;
BEGIN
  -- Only proceed if status changed to cancelled
  IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
    -- Get community if resource is in one
    SELECT community_id INTO resource_community_id
    FROM resource_communities
    WHERE resource_id = NEW.id
    LIMIT 1;
    
    -- Notify all approved claimants
    FOR claim_record IN 
      SELECT claimant_id 
      FROM resource_claims 
      WHERE resource_id = NEW.id 
        AND status = 'approved'
        AND claimant_id != NEW.owner_id
    LOOP
      PERFORM notify_resource_cancelled(
        claim_record.claimant_id,
        NEW.owner_id,
        NEW.id,
        resource_community_id
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update shoutout notification trigger
CREATE OR REPLACE FUNCTION notify_on_shoutout()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM notify_shoutout(
    NEW.receiver_id,
    NEW.sender_id,
    NEW.id,
    NEW.community_id
  );
  
  RETURN NEW;
END;
$$;

-- Update connection request notification trigger
CREATE OR REPLACE FUNCTION notify_on_connection_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM notify_connection_request(
    NEW.initiator_id,
    NEW.requester_id
  );
  
  RETURN NEW;
END;
$$;

-- Update connection accepted notification trigger
CREATE OR REPLACE FUNCTION notify_on_connection_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only notify if status changed to accepted
  IF OLD.status != 'accepted' AND NEW.status = 'accepted' THEN
    PERFORM notify_connection_accepted(
      NEW.requester_id,
      NEW.initiator_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update membership join notification trigger
CREATE OR REPLACE FUNCTION notify_on_membership_join()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  organizer_record RECORD;
BEGIN
  -- Notify all organizers about new member
  FOR organizer_record IN 
    SELECT user_id 
    FROM community_memberships 
    WHERE community_id = NEW.community_id 
      AND role = 'organizer'
      AND user_id != NEW.user_id
  LOOP
    PERFORM notify_community_member_joined(
      organizer_record.user_id,
      NEW.user_id,
      NEW.community_id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Update membership leave notification trigger
CREATE OR REPLACE FUNCTION notify_on_membership_leave()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  organizer_record RECORD;
BEGIN
  -- Notify all organizers about member leaving
  FOR organizer_record IN 
    SELECT user_id 
    FROM community_memberships 
    WHERE community_id = OLD.community_id 
      AND role = 'organizer'
      AND user_id != OLD.user_id
  LOOP
    PERFORM notify_community_member_left(
      organizer_record.user_id,
      OLD.user_id,
      OLD.community_id
    );
  END LOOP;
  
  RETURN OLD;
END;
$$;

-- Update trust points notification trigger
CREATE OR REPLACE FUNCTION notify_on_trust_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only notify on score increase
  IF NEW.score > COALESCE(OLD.score, 0) THEN
    PERFORM notify_trust_points(
      NEW.user_id,
      NEW.community_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update trust level notification trigger
CREATE OR REPLACE FUNCTION notify_on_trust_level_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Trust scores don't have a level field currently
  -- This would be triggered based on score thresholds
  -- For now, return without action
  RETURN NEW;
END;
$$;

-- Update resource community notification trigger
DROP TRIGGER IF EXISTS resource_community_notification_trigger ON resource_communities;

CREATE OR REPLACE FUNCTION notify_on_resource_community_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  resource_record RECORD;
  member_record RECORD;
BEGIN
  -- Get resource details
  SELECT * INTO resource_record
  FROM resources
  WHERE id = NEW.resource_id;
  
  -- Skip if resource doesn't exist or is not open
  IF resource_record IS NULL OR resource_record.status != 'open' THEN
    RETURN NEW;
  END IF;
  
  -- Notify all community members about new resource
  FOR member_record IN 
    SELECT user_id 
    FROM community_memberships 
    WHERE community_id = NEW.community_id 
      AND user_id != resource_record.owner_id
  LOOP
    PERFORM notify_new_resource(
      member_record.user_id,
      resource_record.owner_id,
      NEW.resource_id,
      NEW.community_id,
      resource_record.type
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- STEP 6: GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION create_notification_base TO service_role;
GRANT EXECUTE ON FUNCTION notify_comment TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION notify_comment_reply TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION notify_new_resource TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION notify_claim TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION notify_claim_approved TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION notify_claim_rejected TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION notify_claim_completed TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION notify_claim_cancelled TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION notify_resource_updated TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION notify_resource_cancelled TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION notify_community_member_joined TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION notify_community_member_left TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION notify_shoutout TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION notify_connection_request TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION notify_connection_accepted TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION notify_trust_points TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION notify_trust_level_change TO authenticated, service_role;

-- ============================================================================
-- STEP 7: MIGRATE EXISTING DATA
-- ============================================================================

-- Update existing notifications to populate new foreign key columns where applicable
UPDATE notifications n
SET shoutout_id = s.id
FROM shoutouts s
WHERE n.type = 'shoutout_received'
  AND n.metadata->>'shoutout_id' IS NOT NULL
  AND s.id::text = n.metadata->>'shoutout_id'
  AND n.shoutout_id IS NULL;

-- Trust scores uses composite key, so community_id is already set

-- ============================================================================
-- STEP 8: RECREATE ALL NOTIFICATION TRIGGERS
-- ============================================================================

-- Drop all existing notification triggers
DROP TRIGGER IF EXISTS comment_notification_trigger ON comments;
DROP TRIGGER IF EXISTS claim_notification_trigger ON resource_claims;
DROP TRIGGER IF EXISTS claim_status_notification_trigger ON resource_claims;
DROP TRIGGER IF EXISTS resource_update_notification_trigger ON resources;
DROP TRIGGER IF EXISTS resource_cancellation_notification_trigger ON resources;
DROP TRIGGER IF EXISTS resource_community_notification_trigger ON resource_communities;
DROP TRIGGER IF EXISTS shoutout_notification_trigger ON shoutouts;
DROP TRIGGER IF EXISTS connection_request_notification_trigger ON connection_requests;
DROP TRIGGER IF EXISTS connection_acceptance_notification_trigger ON connection_requests;
DROP TRIGGER IF EXISTS membership_join_notification_trigger ON community_memberships;
DROP TRIGGER IF EXISTS membership_leave_notification_trigger ON community_memberships;
DROP TRIGGER IF EXISTS trust_points_notification_trigger ON trust_scores;
DROP TRIGGER IF EXISTS trust_level_notification_trigger ON trust_scores;

-- Recreate all triggers to use the updated functions
CREATE TRIGGER comment_notification_trigger
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION notify_on_comment();

CREATE TRIGGER claim_notification_trigger
AFTER INSERT ON resource_claims
FOR EACH ROW
EXECUTE FUNCTION notify_on_claim();

CREATE TRIGGER claim_status_notification_trigger
AFTER UPDATE ON resource_claims
FOR EACH ROW
EXECUTE FUNCTION notify_on_claim_status_change();

CREATE TRIGGER resource_update_notification_trigger
AFTER UPDATE ON resources
FOR EACH ROW
EXECUTE FUNCTION notify_on_resource_update();

CREATE TRIGGER resource_cancellation_notification_trigger
AFTER UPDATE ON resources
FOR EACH ROW
EXECUTE FUNCTION notify_on_resource_cancellation();

CREATE TRIGGER resource_community_notification_trigger
AFTER INSERT ON resource_communities
FOR EACH ROW
EXECUTE FUNCTION notify_on_resource_community_insert();

CREATE TRIGGER shoutout_notification_trigger
AFTER INSERT ON shoutouts
FOR EACH ROW
EXECUTE FUNCTION notify_on_shoutout();

CREATE TRIGGER connection_request_notification_trigger
AFTER INSERT ON connection_requests
FOR EACH ROW
EXECUTE FUNCTION notify_on_connection_request();

CREATE TRIGGER connection_acceptance_notification_trigger
AFTER UPDATE ON connection_requests
FOR EACH ROW
EXECUTE FUNCTION notify_on_connection_accepted();

CREATE TRIGGER membership_join_notification_trigger
AFTER INSERT ON community_memberships
FOR EACH ROW
EXECUTE FUNCTION notify_on_membership_join();

CREATE TRIGGER membership_leave_notification_trigger
AFTER DELETE ON community_memberships
FOR EACH ROW
EXECUTE FUNCTION notify_on_membership_leave();

CREATE TRIGGER trust_points_notification_trigger
AFTER INSERT OR UPDATE ON trust_scores
FOR EACH ROW
EXECUTE FUNCTION notify_on_trust_points();

CREATE TRIGGER trust_level_notification_trigger
AFTER UPDATE ON trust_scores
FOR EACH ROW
EXECUTE FUNCTION notify_on_trust_level_change();

-- ============================================================================
-- STEP 9: REMOVE REDUNDANT COLUMNS
-- ============================================================================

-- Remove the redundant columns that are now generated client-side
ALTER TABLE notifications DROP COLUMN IF EXISTS title;
ALTER TABLE notifications DROP COLUMN IF EXISTS body;
ALTER TABLE notifications DROP COLUMN IF EXISTS image_url;
ALTER TABLE notifications DROP COLUMN IF EXISTS action_url;
ALTER TABLE notifications DROP COLUMN IF EXISTS message_id;
ALTER TABLE notifications DROP COLUMN IF EXISTS conversation_id;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON VIEW notification_details IS 'Comprehensive view of notifications with all related data joined for efficient querying';
COMMENT ON FUNCTION create_notification_base IS 'Internal base function for creating notifications - use specialized functions instead';
COMMENT ON FUNCTION notify_comment IS 'Create notification for new comment on a resource';
COMMENT ON FUNCTION notify_comment_reply IS 'Create notification for reply to a comment';
COMMENT ON FUNCTION notify_new_resource IS 'Create notification for new resource/event in community';
COMMENT ON FUNCTION notify_claim IS 'Create notification for new claim on a resource';
COMMENT ON FUNCTION notify_claim_approved IS 'Create notification when claim is approved';
COMMENT ON FUNCTION notify_claim_rejected IS 'Create notification when claim is rejected';
COMMENT ON FUNCTION notify_claim_completed IS 'Create notification when claim is marked completed';
COMMENT ON FUNCTION notify_claim_cancelled IS 'Create notification when claim is cancelled';
COMMENT ON FUNCTION notify_resource_updated IS 'Create notification when claimed resource is updated';
COMMENT ON FUNCTION notify_resource_cancelled IS 'Create notification when claimed resource is cancelled';
COMMENT ON FUNCTION notify_community_member_joined IS 'Create notification when member joins community';
COMMENT ON FUNCTION notify_community_member_left IS 'Create notification when member leaves community';
COMMENT ON FUNCTION notify_shoutout IS 'Create notification for received shoutout';
COMMENT ON FUNCTION notify_connection_request IS 'Create notification for new connection request';
COMMENT ON FUNCTION notify_connection_accepted IS 'Create notification when connection request accepted';
COMMENT ON FUNCTION notify_trust_points IS 'Create notification for trust points received';
COMMENT ON FUNCTION notify_trust_level_change IS 'Create notification for trust level change';