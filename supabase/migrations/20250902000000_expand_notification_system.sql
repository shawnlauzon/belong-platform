-- Expand notification system to support all 19 notification types
-- This expands the existing notification system from 5 to 19 types with proper grouping

-- Update notification types CHECK constraint to include all 19 types plus separate message types
ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN (
    -- Existing types (4 + 2 message types)
    'comment', 'comment_reply', 'claim', 'direct_message', 'community_message', 'new_resource',
    -- New Social Interactions types (3)
    'shoutout_received', 'connection_request', 'connection_accepted',
    -- New My Resources types (2) 
    'resource_claim_cancelled', 'resource_claim_completed',
    -- New My Registrations types (4)
    'claim_approved', 'claim_rejected', 'claimed_resource_updated', 'claimed_resource_cancelled',
    -- New My Communities types (2)
    'community_member_joined', 'community_member_left',
    -- New Community Activity types (1) - new_event uses same table as new_resource
    'new_event',
    -- New Trust & Recognition types (2)
    'trust_points_received', 'trust_level_changed'
  ));

-- Replace new_messages with separate direct_messages and community_messages columns
ALTER TABLE notification_preferences DROP COLUMN IF EXISTS new_messages;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS direct_messages BOOLEAN DEFAULT TRUE;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS community_messages BOOLEAN DEFAULT TRUE;

-- Add new preference columns to notification_preferences table
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS shoutout_received BOOLEAN DEFAULT TRUE;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS connection_request BOOLEAN DEFAULT TRUE;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS connection_accepted BOOLEAN DEFAULT TRUE;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS resource_claim_cancelled BOOLEAN DEFAULT TRUE;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS resource_claim_completed BOOLEAN DEFAULT TRUE;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS claim_approved BOOLEAN DEFAULT TRUE;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS claim_rejected BOOLEAN DEFAULT TRUE;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS claimed_resource_updated BOOLEAN DEFAULT TRUE;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS claimed_resource_cancelled BOOLEAN DEFAULT TRUE;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS community_member_joined BOOLEAN DEFAULT TRUE;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS community_member_left BOOLEAN DEFAULT TRUE;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS new_event BOOLEAN DEFAULT TRUE;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS trust_points_received BOOLEAN DEFAULT TRUE;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS trust_level_changed BOOLEAN DEFAULT TRUE;

-- Update should_send_notification function to handle all new types
CREATE OR REPLACE FUNCTION should_send_notification(p_user_id UUID, p_type TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  preferences notification_preferences%ROWTYPE;
BEGIN
  SELECT * INTO preferences
  FROM notification_preferences
  WHERE user_id = p_user_id;
  
  -- If no preferences exist, default to true for all types
  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;
  
  -- Check specific preference based on type
  CASE p_type
    -- Existing types
    WHEN 'comment' THEN
      RETURN preferences.comments_on_resources;
    WHEN 'comment_reply' THEN
      RETURN preferences.comment_replies;
    WHEN 'claim' THEN
      RETURN preferences.resource_claims;
    WHEN 'direct_message' THEN
      RETURN preferences.direct_messages;
    WHEN 'community_message' THEN
      RETURN preferences.community_messages;
    WHEN 'new_resource' THEN
      RETURN preferences.community_resources;
    -- New Social Interactions
    WHEN 'shoutout_received' THEN
      RETURN preferences.shoutout_received;
    WHEN 'connection_request' THEN
      RETURN preferences.connection_request;
    WHEN 'connection_accepted' THEN
      RETURN preferences.connection_accepted;
    -- New My Resources
    WHEN 'resource_claim_cancelled' THEN
      RETURN preferences.resource_claim_cancelled;
    WHEN 'resource_claim_completed' THEN
      RETURN preferences.resource_claim_completed;
    -- New My Registrations
    WHEN 'claim_approved' THEN
      RETURN preferences.claim_approved;
    WHEN 'claim_rejected' THEN
      RETURN preferences.claim_rejected;
    WHEN 'claimed_resource_updated' THEN
      RETURN preferences.claimed_resource_updated;
    WHEN 'claimed_resource_cancelled' THEN
      RETURN preferences.claimed_resource_cancelled;
    -- New My Communities
    WHEN 'community_member_joined' THEN
      RETURN preferences.community_member_joined;
    WHEN 'community_member_left' THEN
      RETURN preferences.community_member_left;
    -- New Community Activity
    WHEN 'new_event' THEN
      RETURN preferences.new_event;
    -- New Trust & Recognition
    WHEN 'trust_points_received' THEN
      RETURN preferences.trust_points_received;
    WHEN 'trust_level_changed' THEN
      RETURN preferences.trust_level_changed;
    ELSE
      RETURN TRUE; -- Default to true for unknown types
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update notification counts function to handle new categories
CREATE OR REPLACE FUNCTION update_notification_counts(
  p_user_id UUID,
  p_type TEXT,
  p_delta INTEGER
) RETURNS VOID AS $$
BEGIN
  -- Upsert notification counts record
  INSERT INTO notification_counts (user_id, unread_total, unread_comments, unread_claims, unread_messages, unread_resources)
  VALUES (p_user_id, 0, 0, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Update counts based on type (group similar types together)
  CASE p_type
    WHEN 'comment', 'comment_reply' THEN
      UPDATE notification_counts
      SET unread_comments = GREATEST(0, unread_comments + p_delta),
          unread_total = GREATEST(0, unread_total + p_delta)
      WHERE user_id = p_user_id;
    WHEN 'claim', 'resource_claim_cancelled', 'resource_claim_completed', 'claim_approved', 'claim_rejected', 'claimed_resource_updated', 'claimed_resource_cancelled' THEN
      UPDATE notification_counts
      SET unread_claims = GREATEST(0, unread_claims + p_delta),
          unread_total = GREATEST(0, unread_total + p_delta)
      WHERE user_id = p_user_id;
    WHEN 'direct_message', 'community_message' THEN
      UPDATE notification_counts
      SET unread_messages = GREATEST(0, unread_messages + p_delta),
          unread_total = GREATEST(0, unread_total + p_delta)
      WHERE user_id = p_user_id;
    WHEN 'new_resource', 'new_event', 'community_member_joined', 'community_member_left' THEN
      UPDATE notification_counts
      SET unread_resources = GREATEST(0, unread_resources + p_delta),
          unread_total = GREATEST(0, unread_total + p_delta)
      WHERE user_id = p_user_id;
    ELSE
      -- For all other types (shoutouts, connections, trust scores), add to total only
      UPDATE notification_counts
      SET unread_total = GREATEST(0, unread_total + p_delta)
      WHERE user_id = p_user_id;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- New trigger functions

-- Shoutout notifications
CREATE OR REPLACE FUNCTION notify_on_shoutout() RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  resource_title TEXT;
BEGIN
  -- Get sender name with fallback
  SELECT COALESCE(full_name, first_name || ' ' || last_name, 'Someone') INTO sender_name
  FROM public_profiles
  WHERE id = NEW.sender_id;
  
  -- Fallback if no profile found
  IF sender_name IS NULL THEN
    sender_name := 'Someone';
  END IF;
  
  -- Get resource title
  SELECT title INTO resource_title
  FROM resources
  WHERE id = NEW.resource_id;
  
  -- Notify shoutout receiver
  PERFORM create_or_update_notification(
    NEW.receiver_id,
    'shoutout_received',
    NEW.sender_id,
    'shoutout:' || NEW.resource_id::text,
    sender_name || ' gave you a shoutout',
    NEW.message,
    '/resources/' || NEW.resource_id::text,
    NEW.resource_id,
    NULL, NULL, NULL, NULL, NEW.community_id,
    jsonb_build_object('resource_title', resource_title)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Connection request notifications
CREATE OR REPLACE FUNCTION notify_on_connection_request() RETURNS TRIGGER AS $$
DECLARE
  requester_name TEXT;
  community_name TEXT;
BEGIN
  -- Get requester name with fallback
  SELECT COALESCE(full_name, first_name || ' ' || last_name, 'Someone') INTO requester_name
  FROM public_profiles
  WHERE id = NEW.requester_id;
  
  -- Fallback if no profile found
  IF requester_name IS NULL THEN
    requester_name := 'Someone';
  END IF;
  
  -- Get community name
  SELECT name INTO community_name
  FROM communities
  WHERE id = NEW.community_id;
  
  -- Notify the person being requested to connect
  PERFORM create_or_update_notification(
    NEW.initiator_id,
    'connection_request',
    NEW.requester_id,
    'connection_request:' || NEW.requester_id::text,
    requester_name || ' wants to connect',
    'From ' || community_name,
    '/connections?request=' || NEW.id::text,
    NULL, NULL, NULL, NULL, NULL, NEW.community_id,
    jsonb_build_object('community_name', community_name, 'request_id', NEW.id)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Connection acceptance notifications
CREATE OR REPLACE FUNCTION notify_on_connection_accepted() RETURNS TRIGGER AS $$
DECLARE
  accepter_name TEXT;
  community_name TEXT;
BEGIN
  -- Only notify when status changes to accepted
  IF OLD.status != 'accepted' AND NEW.status = 'accepted' THEN
    -- Get accepter name (the initiator who accepted)
    SELECT COALESCE(full_name, first_name || ' ' || last_name, 'Someone') INTO accepter_name
    FROM public_profiles
    WHERE id = NEW.initiator_id;
    
    -- Fallback if no profile found
    IF accepter_name IS NULL THEN
      accepter_name := 'Someone';
    END IF;
    
    -- Get community name
    SELECT name INTO community_name
    FROM communities
    WHERE id = NEW.community_id;
    
    -- Notify the requester that their request was accepted
    PERFORM create_or_update_notification(
      NEW.requester_id,
      'connection_accepted',
      NEW.initiator_id,
      'connection_accepted:' || NEW.id::text,
      accepter_name || ' accepted your connection',
      'In ' || community_name,
      '/connections',
      NULL, NULL, NULL, NULL, NULL, NEW.community_id,
      jsonb_build_object('community_name', community_name, 'request_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Claim status change notifications
CREATE OR REPLACE FUNCTION notify_on_claim_status_change() RETURNS TRIGGER AS $$
DECLARE
  claimant_name TEXT;
  resource_owner_name TEXT;
  resource_title TEXT;
  resource_owner_id UUID;
BEGIN
  -- Only process if status actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get names and resource info
  SELECT COALESCE(full_name, first_name || ' ' || last_name, 'Someone') INTO claimant_name
  FROM public_profiles WHERE id = NEW.claimant_id;
  
  SELECT owner_id, title INTO resource_owner_id, resource_title
  FROM resources WHERE id = NEW.resource_id;
  
  SELECT COALESCE(full_name, first_name || ' ' || last_name, 'Someone') INTO resource_owner_name
  FROM public_profiles WHERE id = resource_owner_id;
  
  -- Handle different status changes
  CASE NEW.status
    WHEN 'cancelled' THEN
      -- Notify resource owner that claim was cancelled
      PERFORM create_or_update_notification(
        resource_owner_id,
        'resource_claim_cancelled',
        NEW.claimant_id,
        'claim_cancelled:' || NEW.resource_id::text,
        claimant_name || ' cancelled their claim on ' || LOWER(resource_title),
        NULL,
        '/resources/' || NEW.resource_id::text,
        NEW.resource_id, NULL, NEW.id, NULL, NULL, NULL,
        jsonb_build_object('resource_title', resource_title, 'claim_status', NEW.status)
      );
    
    WHEN 'completed' THEN
      -- Notify resource owner that claim was completed
      PERFORM create_or_update_notification(
        resource_owner_id,
        'resource_claim_completed',
        NEW.claimant_id,
        'claim_completed:' || NEW.resource_id::text,
        claimant_name || ' completed ' || LOWER(resource_title),
        NEW.notes,
        '/resources/' || NEW.resource_id::text,
        NEW.resource_id, NULL, NEW.id, NULL, NULL, NULL,
        jsonb_build_object('resource_title', resource_title, 'claim_status', NEW.status)
      );
    
    WHEN 'approved' THEN
      -- Notify claimant that their claim was approved
      PERFORM create_or_update_notification(
        NEW.claimant_id,
        'claim_approved',
        resource_owner_id,
        'claim_approved:' || NEW.id::text,
        resource_owner_name || ' approved your claim for ' || LOWER(resource_title),
        NULL,
        '/resources/' || NEW.resource_id::text,
        NEW.resource_id, NULL, NEW.id, NULL, NULL, NULL,
        jsonb_build_object('resource_title', resource_title, 'claim_status', NEW.status)
      );
    
    WHEN 'rejected' THEN
      -- Notify claimant that their claim was rejected
      PERFORM create_or_update_notification(
        NEW.claimant_id,
        'claim_rejected',
        resource_owner_id,
        'claim_rejected:' || NEW.id::text,
        resource_owner_name || ' declined your claim for ' || LOWER(resource_title),
        NULL,
        '/resources/' || NEW.resource_id::text,
        NEW.resource_id, NULL, NEW.id, NULL, NULL, NULL,
        jsonb_build_object('resource_title', resource_title, 'claim_status', NEW.status)
      );
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Resource update notifications (for claimed resources)
CREATE OR REPLACE FUNCTION notify_on_resource_update() RETURNS TRIGGER AS $$
DECLARE
  resource_owner_name TEXT;
  claimant RECORD;
BEGIN
  -- Only notify if non-status fields changed and resource has claims
  IF OLD.title = NEW.title AND OLD.description = NEW.description AND 
     OLD.location_text = NEW.location_text AND OLD.expires_at = NEW.expires_at THEN
    RETURN NEW;
  END IF;
  
  -- Get resource owner name
  SELECT COALESCE(full_name, first_name || ' ' || last_name, 'Someone') INTO resource_owner_name
  FROM public_profiles WHERE id = NEW.owner_id;
  
  -- Notify all claimants of updates
  FOR claimant IN
    SELECT DISTINCT claimant_id
    FROM resource_claims
    WHERE resource_id = NEW.id 
      AND status NOT IN ('rejected', 'cancelled')
      AND claimant_id != NEW.owner_id
  LOOP
    PERFORM create_or_update_notification(
      claimant.claimant_id,
      'claimed_resource_updated',
      NEW.owner_id,
      'resource_updated:' || NEW.id::text,
      resource_owner_name || ' updated ' || LOWER(NEW.title),
      'A resource you claimed has been updated',
      '/resources/' || NEW.id::text,
      NEW.id, NULL, NULL, NULL, NULL, NULL,
      jsonb_build_object('resource_title', NEW.title, 'update_type', 'resource_details')
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Resource cancellation notifications
CREATE OR REPLACE FUNCTION notify_on_resource_cancellation() RETURNS TRIGGER AS $$
DECLARE
  resource_owner_name TEXT;
  claimant RECORD;
BEGIN
  -- Only notify when status changes to cancelled
  IF OLD.status = NEW.status OR NEW.status != 'cancelled' THEN
    RETURN NEW;
  END IF;
  
  -- Get resource owner name
  SELECT COALESCE(full_name, first_name || ' ' || last_name, 'Someone') INTO resource_owner_name
  FROM public_profiles WHERE id = NEW.owner_id;
  
  -- Notify all claimants of cancellation
  FOR claimant IN
    SELECT DISTINCT claimant_id
    FROM resource_claims
    WHERE resource_id = NEW.id 
      AND status NOT IN ('rejected', 'cancelled')
      AND claimant_id != NEW.owner_id
  LOOP
    PERFORM create_or_update_notification(
      claimant.claimant_id,
      'claimed_resource_cancelled',
      NEW.owner_id,
      'resource_cancelled:' || NEW.id::text,
      resource_owner_name || ' cancelled ' || LOWER(NEW.title),
      'A resource you claimed has been cancelled',
      '/resources/' || NEW.id::text,
      NEW.id, NULL, NULL, NULL, NULL, NULL,
      jsonb_build_object('resource_title', NEW.title, 'cancellation_reason', 'owner_cancelled')
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Community membership notifications
CREATE OR REPLACE FUNCTION notify_on_membership_join() RETURNS TRIGGER AS $$
DECLARE
  member_name TEXT;
  community_name TEXT;
  organizer RECORD;
BEGIN
  -- Get member name
  SELECT COALESCE(full_name, first_name || ' ' || last_name, 'Someone') INTO member_name
  FROM public_profiles WHERE id = NEW.user_id;
  
  -- Get community name
  SELECT name INTO community_name
  FROM communities WHERE id = NEW.community_id;
  
  -- Notify all organizers
  FOR organizer IN
    SELECT DISTINCT user_id
    FROM community_memberships cm
    WHERE cm.community_id = NEW.community_id 
      AND cm.role = 'organizer'
      AND cm.user_id != NEW.user_id
  LOOP
    PERFORM create_or_update_notification(
      organizer.user_id,
      'community_member_joined',
      NEW.user_id,
      'member_joined:' || NEW.community_id::text,
      member_name || ' joined ' || community_name,
      'New member in your community',
      '/communities/' || NEW.community_id::text,
      NULL, NULL, NULL, NULL, NULL, NEW.community_id,
      jsonb_build_object('community_name', community_name, 'member_role', NEW.role)
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION notify_on_membership_leave() RETURNS TRIGGER AS $$
DECLARE
  member_name TEXT;
  community_name TEXT;
  organizer RECORD;
BEGIN
  -- Get member name
  SELECT COALESCE(full_name, first_name || ' ' || last_name, 'Someone') INTO member_name
  FROM public_profiles WHERE id = OLD.user_id;
  
  -- Get community name
  SELECT name INTO community_name
  FROM communities WHERE id = OLD.community_id;
  
  -- Only notify if it wasn't an organizer leaving (they would know)
  IF OLD.role != 'organizer' THEN
    -- Notify all organizers
    FOR organizer IN
      SELECT DISTINCT user_id
      FROM community_memberships cm
      WHERE cm.community_id = OLD.community_id 
        AND cm.role = 'organizer'
        AND cm.user_id != OLD.user_id
    LOOP
      PERFORM create_or_update_notification(
        organizer.user_id,
        'community_member_left',
        OLD.user_id,
        'member_left:' || OLD.community_id::text,
        member_name || ' left ' || community_name,
        'Member left your community',
        '/communities/' || OLD.community_id::text,
        NULL, NULL, NULL, NULL, NULL, OLD.community_id,
        jsonb_build_object('community_name', community_name, 'member_role', OLD.role)
      );
    END LOOP;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trust score notifications
CREATE OR REPLACE FUNCTION notify_on_trust_points() RETURNS TRIGGER AS $$
DECLARE
  community_name TEXT;
  points_gained INTEGER;
BEGIN
  -- Calculate points gained (works for both INSERT and UPDATE)
  IF TG_OP = 'INSERT' THEN
    points_gained := NEW.score;
  ELSE
    points_gained := NEW.score - OLD.score;
  END IF;
  
  -- Only notify if points actually increased
  IF points_gained > 0 THEN
    -- Get community name
    SELECT name INTO community_name
    FROM communities WHERE id = NEW.community_id;
    
    -- Notify user of points gained
    PERFORM create_or_update_notification(
      NEW.user_id,
      'trust_points_received',
      NEW.user_id, -- Self-notification for system events
      'trust_points:' || NEW.community_id::text,
      'You earned ' || points_gained || ' trust points',
      'In ' || community_name,
      '/communities/' || NEW.community_id::text,
      NULL, NULL, NULL, NULL, NULL, NEW.community_id,
      jsonb_build_object('points_gained', points_gained, 'community_name', community_name, 'total_score', NEW.score)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trust level change notifications (basic implementation - assumes levels at 0, 10, 25, 50, 100, 250, 500)
CREATE OR REPLACE FUNCTION notify_on_trust_level_change() RETURNS TRIGGER AS $$
DECLARE
  community_name TEXT;
  old_level INTEGER;
  new_level INTEGER;
  level_thresholds INTEGER[] := ARRAY[0, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
  level_names TEXT[] := ARRAY['Newcomer', 'Helper', 'Contributor', 'Regular', 'Trusted', 'Leader', 'Champion', 'Legend', 'Hero', 'Master'];
  i INTEGER;
BEGIN
  -- Only process on UPDATE when score actually changed
  IF TG_OP != 'UPDATE' OR OLD.score = NEW.score THEN
    RETURN NEW;
  END IF;
  
  -- Calculate old and new levels
  old_level := 1;
  new_level := 1;
  
  FOR i IN 1..array_length(level_thresholds, 1) LOOP
    IF OLD.score >= level_thresholds[i] THEN
      old_level := i;
    END IF;
    IF NEW.score >= level_thresholds[i] THEN
      new_level := i;
    END IF;
  END LOOP;
  
  -- Only notify if level increased
  IF new_level > old_level THEN
    -- Get community name
    SELECT name INTO community_name
    FROM communities WHERE id = NEW.community_id;
    
    -- Notify user of level change
    PERFORM create_or_update_notification(
      NEW.user_id,
      'trust_level_changed',
      NEW.user_id, -- Self-notification for system events
      'trust_level:' || NEW.community_id::text,
      'You reached ' || level_names[new_level] || ' level!',
      'In ' || community_name,
      '/communities/' || NEW.community_id::text,
      NULL, NULL, NULL, NULL, NULL, NEW.community_id,
      jsonb_build_object(
        'old_level', level_names[old_level], 
        'new_level', level_names[new_level],
        'community_name', community_name, 
        'total_score', NEW.score
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing resource notification function to handle events specifically
CREATE OR REPLACE FUNCTION notify_on_resource_community_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  resource_record resources%ROWTYPE;
  resource_author_name TEXT;
  community_name TEXT;
  community_member RECORD;
  notification_type TEXT;
BEGIN
  -- Get the resource details
  SELECT * INTO resource_record
  FROM resources
  WHERE id = NEW.resource_id;
  
  -- Get the community name
  SELECT name INTO community_name
  FROM communities
  WHERE id = NEW.community_id;
  
  -- Get resource author name with fallback
  SELECT COALESCE(full_name, first_name || ' ' || last_name, 'Someone') INTO resource_author_name
  FROM public_profiles
  WHERE id = resource_record.owner_id;
  
  -- Fallback if no profile found
  IF resource_author_name IS NULL THEN
    resource_author_name := 'Someone';
  END IF;
  
  -- Determine notification type based on resource category
  IF resource_record.category = 'event' THEN
    notification_type := 'new_event';
  ELSE
    notification_type := 'new_resource';
  END IF;
  
  -- Notify all members of this specific community
  FOR community_member IN
    SELECT DISTINCT cm.user_id
    FROM community_memberships cm
    WHERE cm.community_id = NEW.community_id
      AND cm.user_id != resource_record.owner_id -- Don't notify the resource owner
  LOOP
    PERFORM create_or_update_notification(
      community_member.user_id,
      notification_type,
      resource_record.owner_id,
      notification_type || ':' || community_name,
      'New ' || LOWER(resource_record.category::text) || ' in ' || community_name,
      resource_record.title,
      '/resources/' || resource_record.id::text,
      resource_record.id,
      NULL, NULL, NULL, NULL, NEW.community_id,
      jsonb_build_object('resource_title', resource_record.title, 'community_name', community_name, 'resource_category', resource_record.category)
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Create triggers for new notification types

-- Shoutouts trigger
CREATE TRIGGER shoutout_notification_trigger
AFTER INSERT ON shoutouts
FOR EACH ROW
EXECUTE FUNCTION notify_on_shoutout();

-- Connection request trigger
CREATE TRIGGER connection_request_notification_trigger
AFTER INSERT ON connection_requests
FOR EACH ROW
EXECUTE FUNCTION notify_on_connection_request();

-- Connection acceptance trigger  
CREATE TRIGGER connection_acceptance_notification_trigger
AFTER UPDATE ON connection_requests
FOR EACH ROW
EXECUTE FUNCTION notify_on_connection_accepted();

-- Claim status change trigger
CREATE TRIGGER claim_status_notification_trigger
AFTER UPDATE ON resource_claims
FOR EACH ROW
EXECUTE FUNCTION notify_on_claim_status_change();

-- Resource update trigger
CREATE TRIGGER resource_update_notification_trigger
AFTER UPDATE ON resources
FOR EACH ROW
EXECUTE FUNCTION notify_on_resource_update();

-- Resource cancellation trigger (same trigger, different logic)
CREATE TRIGGER resource_cancellation_notification_trigger
AFTER UPDATE ON resources
FOR EACH ROW
EXECUTE FUNCTION notify_on_resource_cancellation();

-- Community membership triggers
CREATE TRIGGER membership_join_notification_trigger
AFTER INSERT ON community_memberships
FOR EACH ROW
EXECUTE FUNCTION notify_on_membership_join();

CREATE TRIGGER membership_leave_notification_trigger
AFTER DELETE ON community_memberships
FOR EACH ROW
EXECUTE FUNCTION notify_on_membership_leave();

-- Trust score triggers
CREATE TRIGGER trust_points_notification_trigger
AFTER INSERT OR UPDATE ON trust_scores
FOR EACH ROW
EXECUTE FUNCTION notify_on_trust_points();

CREATE TRIGGER trust_level_notification_trigger
AFTER UPDATE ON trust_scores
FOR EACH ROW
EXECUTE FUNCTION notify_on_trust_level_change();