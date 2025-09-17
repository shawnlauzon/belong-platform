-- Enable community member notification triggers
--
-- The triggers for community_member_joined and community_member_left notifications
-- were disabled (in 'O' origin mode) which meant they only fired for replication,
-- not for regular database operations. This migration enables them properly.
--
-- These triggers notify organizers when:
-- - New members join their community (community_member_joined)
-- - Members leave their community (community_member_left)

-- Enable membership join notification trigger
-- This triggers when someone joins a community and notifies all organizers
ALTER TABLE community_memberships ENABLE ALWAYS TRIGGER membership_join_notification_trigger;

-- Enable membership leave notification trigger
-- This triggers when someone leaves a community and notifies all organizers
ALTER TABLE community_memberships ENABLE ALWAYS TRIGGER membership_leave_notification_trigger;

-- Fix trigger functions to notify both organizers AND founders
-- The original functions only notified organizers, but founders should also be notified

-- Update membership join notification trigger to include founders
CREATE OR REPLACE FUNCTION notify_on_membership_join()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  leader_record RECORD;
BEGIN
  -- Notify all organizers and founders about new member
  FOR leader_record IN
    SELECT user_id
    FROM community_memberships
    WHERE community_id = NEW.community_id
      AND role IN ('organizer', 'founder')
      AND user_id != NEW.user_id
  LOOP
    PERFORM notify_community_member_joined(
      leader_record.user_id,
      NEW.user_id,
      NEW.community_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Update membership leave notification trigger to include founders
CREATE OR REPLACE FUNCTION notify_on_membership_leave()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  leader_record RECORD;
BEGIN
  -- Notify all organizers and founders about member leaving
  FOR leader_record IN
    SELECT user_id
    FROM community_memberships
    WHERE community_id = OLD.community_id
      AND role IN ('organizer', 'founder')
      AND user_id != OLD.user_id
  LOOP
    PERFORM notify_community_member_left(
      leader_record.user_id,
      OLD.user_id,
      OLD.community_id
    );
  END LOOP;

  RETURN OLD;
END;
$$;