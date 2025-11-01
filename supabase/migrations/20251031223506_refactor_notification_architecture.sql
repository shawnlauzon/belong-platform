-- ============================================================================
-- Notification System Architecture Refactor
-- ============================================================================
-- This migration implements clean separation of concerns:
-- 1. State validation (claim_status_transition_rules table)
-- 2. Notification creation (business logic in triggers)
-- 3. Notification delivery (universal deliver_notification function)
--
-- Benefits:
-- - Single source of truth for delivery logic
-- - Email and push can't get out of sync
-- - Easy to add new delivery channels
-- - Simpler, more maintainable code

-- ============================================================================
-- PART 1: State Transition Rules Table
-- ============================================================================

CREATE TABLE claim_status_transition_rules (
  id SERIAL PRIMARY KEY,
  resource_type resource_type NOT NULL,
  from_status resource_claim_status NOT NULL,
  to_status resource_claim_status NOT NULL,
  allowed_actor TEXT NOT NULL CHECK (allowed_actor IN ('owner', 'claimant', 'system')),
  description TEXT,
  UNIQUE(resource_type, from_status, to_status, allowed_actor)
);

COMMENT ON TABLE claim_status_transition_rules IS 'Defines valid claim status transitions by resource type and actor';
COMMENT ON COLUMN claim_status_transition_rules.allowed_actor IS 'Who can make this transition: owner, claimant, or system';

-- Populate with valid transitions

-- OFFERS: owner gives, claimant receives
INSERT INTO claim_status_transition_rules (resource_type, from_status, to_status, allowed_actor, description) VALUES
  -- Initial approval/rejection
  ('offer', 'pending', 'approved', 'owner', 'Owner approves claim'),
  ('offer', 'pending', 'rejected', 'owner', 'Owner rejects claim'),

  -- Handoff process
  ('offer', 'approved', 'given', 'owner', 'Owner marks as given'),
  ('offer', 'approved', 'received', 'claimant', 'Claimant marks as received'),
  ('offer', 'approved', 'cancelled', 'claimant', 'Claimant cancels claim'),

  -- Completion
  ('offer', 'given', 'completed', 'claimant', 'Claimant confirms receipt'),
  ('offer', 'received', 'completed', 'owner', 'Owner confirms handoff');

-- REQUESTS: claimant gives, owner receives
INSERT INTO claim_status_transition_rules (resource_type, from_status, to_status, allowed_actor, description) VALUES
  -- Initial approval/rejection
  ('request', 'pending', 'approved', 'owner', 'Owner approves helper'),
  ('request', 'pending', 'rejected', 'owner', 'Owner rejects helper'),

  -- Handoff process
  ('request', 'approved', 'given', 'claimant', 'Helper marks as given'),
  ('request', 'approved', 'received', 'owner', 'Owner marks as received'),
  ('request', 'approved', 'cancelled', 'claimant', 'Helper cancels'),

  -- Completion
  ('request', 'given', 'completed', 'owner', 'Owner confirms receipt'),
  ('request', 'received', 'completed', 'claimant', 'Helper confirms');

-- EVENTS: different flow entirely
INSERT INTO claim_status_transition_rules (resource_type, from_status, to_status, allowed_actor, description) VALUES
  -- Initial approval/rejection
  ('event', 'pending', 'approved', 'owner', 'Owner approves registration'),
  ('event', 'pending', 'rejected', 'owner', 'Owner rejects registration'),

  -- RSVP and attendance
  ('event', 'approved', 'going', 'claimant', 'Attendee confirms going'),
  ('event', 'approved', 'cancelled', 'claimant', 'Attendee cancels'),
  ('event', 'going', 'attended', 'owner', 'Owner marks attended'),
  ('event', 'going', 'flaked', 'owner', 'Owner marks as no-show'),
  ('event', 'going', 'cancelled', 'claimant', 'Attendee cancels after RSVP'),

  -- Vote transitions (for voting events)
  ('event', 'vote', 'pending', 'system', 'System converts vote to pending'),
  ('event', 'vote', 'going', 'system', 'System converts vote to going'),
  ('event', 'vote', 'cancelled', 'claimant', 'User cancels their vote');

-- ============================================================================
-- PART 2: Metadata-Aware Notification Creation
-- ============================================================================
-- Update create_notification_base to automatically build metadata based on entity IDs

-- Drop old version that takes p_metadata parameter
DROP FUNCTION IF EXISTS create_notification_base(UUID, action_type, UUID, UUID, UUID, UUID, UUID, UUID, UUID, JSONB);

CREATE OR REPLACE FUNCTION create_notification_base(
  p_user_id UUID,
  p_action action_type,
  p_actor_id UUID DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_comment_id UUID DEFAULT NULL,
  p_claim_id UUID DEFAULT NULL,
  p_shoutout_id UUID DEFAULT NULL,
  p_community_id UUID DEFAULT NULL,
  p_conversation_id UUID DEFAULT NULL,
  p_changes TEXT[] DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
  v_metadata JSONB := '{}'::jsonb;
  v_resource RECORD;
  v_comment RECORD;
  v_claim RECORD;
BEGIN
  -- Build metadata based on which entity IDs are provided

  -- Resource metadata (status, voting_deadline, timeslot)
  IF p_resource_id IS NOT NULL THEN
    SELECT r.status, r.voting_deadline, rt.start_time, rt.end_time
    INTO v_resource
    FROM resources r
    LEFT JOIN resource_timeslots rt ON rt.resource_id = r.id
    WHERE r.id = p_resource_id
    LIMIT 1;

    IF FOUND THEN
      v_metadata := v_metadata || jsonb_build_object(
        'resource_status', v_resource.status,
        'voting_deadline', v_resource.voting_deadline,
        'timeslot_start_time', v_resource.start_time,
        'timeslot_end_time', v_resource.end_time
      );
    END IF;
  END IF;

  -- Comment metadata (content preview)
  IF p_comment_id IS NOT NULL THEN
    SELECT content INTO v_comment
    FROM comments
    WHERE id = p_comment_id;

    IF FOUND THEN
      v_metadata := v_metadata || jsonb_build_object(
        'content_preview', LEFT(v_comment.content, 200)
      );
    END IF;
  END IF;

  -- Claim metadata (response/status)
  IF p_claim_id IS NOT NULL THEN
    SELECT status INTO v_claim
    FROM resource_claims
    WHERE id = p_claim_id;

    IF FOUND THEN
      v_metadata := v_metadata || jsonb_build_object(
        'response', v_claim.status::text
      );
    END IF;
  END IF;

  -- Changes metadata (for resource.updated)
  IF p_changes IS NOT NULL THEN
    v_metadata := v_metadata || jsonb_build_object(
      'changes', p_changes
    );
  END IF;

  -- Insert notification with built metadata
  INSERT INTO notifications (
    user_id,
    action,
    actor_id,
    resource_id,
    comment_id,
    claim_id,
    shoutout_id,
    community_id,
    conversation_id,
    metadata
  ) VALUES (
    p_user_id,
    p_action,
    p_actor_id,
    p_resource_id,
    p_comment_id,
    p_claim_id,
    p_shoutout_id,
    p_community_id,
    p_conversation_id,
    v_metadata
  )
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$;

COMMENT ON FUNCTION create_notification_base IS 'Creates notification with automatic metadata construction based on entity IDs';

-- ============================================================================
-- PART 3: Universal Notification Delivery Function
-- ============================================================================
-- This single function handles delivery for ALL notification types
-- Triggers automatically when a notification is created

CREATE OR REPLACE FUNCTION deliver_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_title TEXT;
  notification_body TEXT;
BEGIN
  -- Generate title and body based on action type
  -- These are simple defaults; the Edge Functions will fetch full details from notification_details view
  notification_title := CASE NEW.action
    WHEN 'claim.created' THEN 'New claim on your resource'
    WHEN 'claim.approved' THEN 'Your claim was approved'
    WHEN 'claim.rejected' THEN 'Your claim was rejected'
    WHEN 'claim.cancelled' THEN 'Claim cancelled'
    WHEN 'claim.completed' THEN 'Claim completed'
    WHEN 'resource.given' THEN 'Resource marked as given'
    WHEN 'resource.received' THEN 'Resource confirmed received'
    WHEN 'resource.commented' THEN 'New comment on your resource'
    WHEN 'comment.replied' THEN 'New reply to your comment'
    WHEN 'message.received' THEN 'New message'
    WHEN 'conversation.requested' THEN 'New conversation'
    WHEN 'shoutout.received' THEN 'You received a shoutout!'
    WHEN 'member.joined' THEN 'New member joined'
    WHEN 'member.left' THEN 'Member left'
    WHEN 'resource.created' THEN 'New resource'
    WHEN 'event.created' THEN 'New event'
    ELSE 'Notification'
  END;

  notification_body := 'You have a new notification';

  -- Send push notification if enabled for this user/type
  IF should_send_push(NEW.user_id, NEW.action) THEN
    PERFORM send_push_notification_async(
      NEW.user_id,
      NEW.id,
      NEW.action,
      notification_title,
      notification_body
    );
  END IF;

  -- Send email notification if enabled for this user/type
  IF should_send_email(NEW.user_id, NEW.action) THEN
    PERFORM send_email_notification_async(
      NEW.user_id,
      NEW.id,
      NEW.action,
      notification_title,
      notification_body
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on notifications table
CREATE TRIGGER deliver_notification_trigger
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION deliver_notification();

COMMENT ON FUNCTION deliver_notification() IS 'Universal notification delivery - handles push and email for all notification types';

-- ============================================================================
-- PART 4: Simplify Notification Creation Triggers
-- ============================================================================
-- Remove all metadata construction from these functions - create_notification_base handles it now

-- 3.1: Claims
CREATE OR REPLACE FUNCTION notify_on_claim()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  resource_owner_id UUID;
  notification_id UUID;
BEGIN
  -- Get resource owner
  SELECT owner_id INTO resource_owner_id
  FROM resources
  WHERE id = NEW.resource_id;

  -- Skip if owner is claiming their own resource
  IF resource_owner_id = NEW.claimant_id THEN
    RETURN NEW;
  END IF;

  -- Skip vote claims
  IF NEW.status = 'vote' THEN
    RETURN NEW;
  END IF;

  -- Notify resource owner (just create the notification record)
  IF resource_owner_id IS NOT NULL THEN
    notification_id := create_notification_base(
      p_user_id := resource_owner_id,
      p_action := 'claim.created',
      p_actor_id := NEW.claimant_id,
      p_resource_id := NEW.resource_id,
      p_claim_id := NEW.id,
      p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.resource_id LIMIT 1)
    );
    -- Metadata built automatically, delivery happens via deliver_notification trigger
  END IF;

  RETURN NEW;
END;
$$;

-- 3.2: Claim Status Changes
CREATE OR REPLACE FUNCTION notify_on_claim_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  resource_owner_id UUID;
  resource_type_val resource_type;
  notification_id UUID;
  action_to_notify action_type;
  recipient_id UUID;
BEGIN
  -- Skip if status didn't change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get resource owner and type
  SELECT owner_id, type INTO resource_owner_id, resource_type_val
  FROM resources
  WHERE id = NEW.resource_id;

  -- Handle approved/rejected
  IF NEW.status IN ('approved', 'rejected') THEN
    action_to_notify := CASE NEW.status
      WHEN 'approved' THEN 'claim.approved'::action_type
      ELSE 'claim.rejected'::action_type
    END;

    PERFORM create_notification_base(
      p_user_id := NEW.claimant_id,
      p_action := action_to_notify,
      p_actor_id := resource_owner_id,
      p_resource_id := NEW.resource_id,
      p_claim_id := NEW.id,
      p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.resource_id LIMIT 1)
    );
  END IF;

  -- Handle cancelled
  IF NEW.status = 'cancelled' THEN
    PERFORM create_notification_base(
      p_user_id := resource_owner_id,
      p_action := 'claim.cancelled',
      p_actor_id := NEW.claimant_id,
      p_resource_id := NEW.resource_id,
      p_claim_id := NEW.id,
      p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.resource_id LIMIT 1)
    );
  END IF;

  -- Handle approved � given (FIXED: correct transitions)
  IF OLD.status = 'approved' AND NEW.status = 'given' THEN
    -- For offers: owner marked as given, notify claimant
    -- For requests: claimant marked as given, notify owner
    recipient_id := CASE resource_type_val
      WHEN 'offer' THEN NEW.claimant_id
      WHEN 'request' THEN resource_owner_id
    END;

    IF recipient_id IS NOT NULL THEN
      PERFORM create_notification_base(
        p_user_id := recipient_id,
        p_action := 'resource.given',
        p_actor_id := CASE resource_type_val
          WHEN 'offer' THEN resource_owner_id
          WHEN 'request' THEN NEW.claimant_id
        END,
        p_resource_id := NEW.resource_id,
        p_claim_id := NEW.id,
        p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.resource_id LIMIT 1)
      );
    END IF;
  END IF;

  -- Handle approved � received (FIXED: correct transitions)
  IF OLD.status = 'approved' AND NEW.status = 'received' THEN
    -- For offers: claimant marked as received, notify owner
    -- For requests: owner marked as received, notify claimant
    recipient_id := CASE resource_type_val
      WHEN 'offer' THEN resource_owner_id
      WHEN 'request' THEN NEW.claimant_id
    END;

    IF recipient_id IS NOT NULL THEN
      PERFORM create_notification_base(
        p_user_id := recipient_id,
        p_action := 'resource.received',
        p_actor_id := CASE resource_type_val
          WHEN 'offer' THEN NEW.claimant_id
          WHEN 'request' THEN resource_owner_id
        END,
        p_resource_id := NEW.resource_id,
        p_claim_id := NEW.id,
        p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.resource_id LIMIT 1)
      );
    END IF;
  END IF;

  -- Handle given � completed (FIXED: added)
  IF OLD.status = 'given' AND NEW.status = 'completed' THEN
    -- For offers: claimant confirmed, notify owner
    -- For requests: owner confirmed, notify claimant
    recipient_id := CASE resource_type_val
      WHEN 'offer' THEN resource_owner_id
      WHEN 'request' THEN NEW.claimant_id
    END;

    IF recipient_id IS NOT NULL THEN
      PERFORM create_notification_base(
        p_user_id := recipient_id,
        p_action := 'claim.completed',
        p_actor_id := CASE resource_type_val
          WHEN 'offer' THEN NEW.claimant_id
          WHEN 'request' THEN resource_owner_id
        END,
        p_resource_id := NEW.resource_id,
        p_claim_id := NEW.id,
        p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.resource_id LIMIT 1)
      );
    END IF;
  END IF;

  -- Handle received � completed (FIXED: added)
  IF OLD.status = 'received' AND NEW.status = 'completed' THEN
    -- For offers: owner confirmed, notify claimant
    -- For requests: claimant confirmed, notify owner
    recipient_id := CASE resource_type_val
      WHEN 'offer' THEN NEW.claimant_id
      WHEN 'request' THEN resource_owner_id
    END;

    IF recipient_id IS NOT NULL THEN
      PERFORM create_notification_base(
        p_user_id := recipient_id,
        p_action := 'claim.completed',
        p_actor_id := CASE resource_type_val
          WHEN 'offer' THEN resource_owner_id
          WHEN 'request' THEN NEW.claimant_id
        END,
        p_resource_id := NEW.resource_id,
        p_claim_id := NEW.id,
        p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.resource_id LIMIT 1)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 3.3: Comments
CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  resource_owner_id UUID;
  parent_comment_author_id UUID;
  notification_id UUID;
BEGIN
  -- Get resource owner
  SELECT owner_id INTO resource_owner_id
  FROM resources
  WHERE id = NEW.resource_id;

  -- If this is a reply, get parent comment author
  IF NEW.parent_id IS NOT NULL THEN
    SELECT author_id INTO parent_comment_author_id
    FROM comments
    WHERE id = NEW.parent_id;

    -- Notify parent comment author
    IF parent_comment_author_id IS NOT NULL
       AND parent_comment_author_id != NEW.author_id THEN
      PERFORM create_notification_base(
        p_user_id := parent_comment_author_id,
        p_action := 'comment.replied',
        p_actor_id := NEW.author_id,
        p_resource_id := NEW.resource_id,
        p_comment_id := NEW.id,
        p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.resource_id LIMIT 1)
      );
    END IF;
  END IF;

  -- Notify resource owner
  IF resource_owner_id IS NOT NULL
     AND resource_owner_id != NEW.author_id
     AND (parent_comment_author_id IS NULL OR resource_owner_id != parent_comment_author_id) THEN
    PERFORM create_notification_base(
      p_user_id := resource_owner_id,
      p_action := 'resource.commented',
      p_actor_id := NEW.author_id,
      p_resource_id := NEW.resource_id,
      p_comment_id := NEW.id,
      p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.resource_id LIMIT 1)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 3.4: Shoutouts
CREATE OR REPLACE FUNCTION notify_on_shoutout()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  PERFORM create_notification_base(
    p_user_id := NEW.receiver_id,
    p_action := 'shoutout.received',
    p_actor_id := NEW.sender_id,
    p_shoutout_id := NEW.id,
    p_community_id := NEW.community_id
  );

  RETURN NEW;
END;
$$;

-- 3.5: Messages
CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  participant_id UUID;
  notification_id UUID;
BEGIN
  -- Notify all participants except the sender
  FOR participant_id IN
    SELECT user_id
    FROM conversation_participants
    WHERE conversation_id = NEW.conversation_id
      AND user_id != NEW.sender_id
  LOOP
    PERFORM create_notification_base(
      p_user_id := participant_id,
      p_action := 'message.received',
      p_actor_id := NEW.sender_id,
      p_conversation_id := NEW.conversation_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- 3.6: Conversations
CREATE OR REPLACE FUNCTION notify_on_new_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conv_initiator_id UUID;
  notification_id UUID;
BEGIN
  RAISE NOTICE 'notify_on_new_conversation: Starting for participant % in conversation %', NEW.user_id, NEW.conversation_id;

  -- Get the conversation initiator
  SELECT initiator_id INTO conv_initiator_id
  FROM conversations
  WHERE id = NEW.conversation_id;

  RAISE NOTICE 'notify_on_new_conversation: conv_initiator_id = %, NEW.user_id = %', conv_initiator_id, NEW.user_id;

  -- Only notify if this participant is NOT the initiator
  IF NEW.user_id != conv_initiator_id THEN
    RAISE NOTICE 'notify_on_new_conversation: Processing participant % (not initiator)', NEW.user_id;
    RAISE NOTICE 'notify_on_new_conversation: Creating notification for participant %', NEW.user_id;

    PERFORM create_notification_base(
      p_user_id := NEW.user_id,
      p_action := 'conversation.requested',
      p_actor_id := conv_initiator_id,
      p_conversation_id := NEW.conversation_id
    );
  ELSE
    RAISE NOTICE 'notify_on_new_conversation: Skipping initiator %', NEW.user_id;
  END IF;

  RAISE NOTICE 'notify_on_new_conversation: Completed successfully';
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'notify_on_new_conversation: ERROR - % %', SQLERRM, SQLSTATE;
    RAISE;
END;
$$;

-- 3.7: Membership Changes
CREATE OR REPLACE FUNCTION notify_on_membership_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_record RECORD;
  notification_id UUID;
  action_val action_type;
BEGIN
  -- Determine notification type based on operation
  IF TG_OP = 'INSERT' THEN
    action_val := 'member.joined';
  ELSIF TG_OP = 'DELETE' THEN
    action_val := 'member.left';
  ELSE
    RETURN NEW;
  END IF;

  -- Notify community admins (organizers and founders)
  FOR admin_record IN
    SELECT user_id
    FROM community_memberships
    WHERE community_id = COALESCE(NEW.community_id, OLD.community_id)
      AND role IN ('organizer', 'founder')
      AND user_id != COALESCE(NEW.user_id, OLD.user_id)
  LOOP
    PERFORM create_notification_base(
      p_user_id := admin_record.user_id,
      p_action := action_val,
      p_actor_id := COALESCE(NEW.user_id, OLD.user_id),
      p_community_id := COALESCE(NEW.community_id, OLD.community_id)
    );
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 3.8: New Resources
CREATE OR REPLACE FUNCTION notify_new_resource(
  p_user_id UUID,
  p_actor_id UUID,
  p_resource_id UUID,
  p_community_id UUID,
  p_resource_type resource_type,
  p_resource_title TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  action_val action_type;
  notification_id UUID;
BEGIN
  -- Determine notification type based on resource type
  IF p_resource_type = 'event' THEN
    action_val := 'event.created';
  ELSE
    action_val := 'resource.created';
  END IF;

  -- Create notification - metadata built automatically, delivery happens via trigger
  notification_id := create_notification_base(
    p_user_id := p_user_id,
    p_action := action_val,
    p_actor_id := p_actor_id,
    p_resource_id := p_resource_id,
    p_community_id := p_community_id
  );

  RETURN notification_id;
END;
$$;

-- 3.9: Resource-Community Association (triggers notify_new_resource)
CREATE OR REPLACE FUNCTION notify_on_resource_community_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  resource_record RECORD;
  member_record RECORD;
  action_val action_type;
BEGIN
  -- Get resource details
  SELECT * INTO resource_record
  FROM resources
  WHERE id = NEW.resource_id;

  -- Skip if resource doesn't exist or is not active
  IF resource_record IS NULL OR resource_record.status != 'active' THEN
    RETURN NEW;
  END IF;

  -- Determine action type
  IF resource_record.type = 'event' THEN
    action_val := 'event.created';
  ELSE
    action_val := 'resource.created';
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
      resource_record.type,
      resource_record.title
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- PART 5: Refactor State Validation to Use Rules Table
-- ============================================================================
-- Replace hardcoded CASE statements with table-driven validation

CREATE OR REPLACE FUNCTION validate_claim_state_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  resource_record RECORD;
  user_is_owner BOOLEAN := FALSE;
  user_is_claimant BOOLEAN := FALSE;
  actor_role TEXT;
  is_valid_transition BOOLEAN := FALSE;
BEGIN
  -- Get resource information
  SELECT r.type, r.requires_approval, r.owner_id, r.status as resource_status
  INTO resource_record
  FROM resources r
  WHERE r.id = NEW.resource_id;

  -- Determine user role
  user_is_owner := (auth.uid() = resource_record.owner_id);
  user_is_claimant := (auth.uid() = NEW.claimant_id);

  -- If only commitment_level changed, allow it for claimants on approved claims
  IF OLD.status = NEW.status AND OLD.commitment_level != NEW.commitment_level THEN
    IF NOT user_is_claimant THEN
      RAISE EXCEPTION 'Only the claimant can update their commitment level';
    END IF;

    -- Don't allow commitment level changes on terminal states
    IF NEW.status IN ('rejected', 'completed', 'cancelled', 'attended', 'flaked') THEN
      RAISE EXCEPTION 'Cannot change commitment level on % claims', NEW.status;
    END IF;

    RETURN NEW;
  END IF;

  -- Validate initial states
  IF TG_OP = 'INSERT' THEN
    -- Allow 'vote' status for voting events
    IF NEW.status = 'vote' THEN
      IF resource_record.resource_status != 'voting' THEN
        RAISE EXCEPTION 'Vote claims can only be created for voting resources';
      END IF;
      RETURN NEW;
    END IF;

    -- Standard initial status validation
    IF resource_record.type = 'event' THEN
      IF resource_record.requires_approval AND NEW.status != 'pending' THEN
        RAISE EXCEPTION 'New event registrations requiring approval must start with pending status';
      ELSIF NOT resource_record.requires_approval AND NEW.status != 'approved' THEN
        RAISE EXCEPTION 'New event registrations not requiring approval must start with approved status';
      END IF;
    ELSE
      IF resource_record.requires_approval AND NEW.status != 'pending' THEN
        RAISE EXCEPTION 'New % claims requiring approval must start with pending status', resource_record.type;
      ELSIF NOT resource_record.requires_approval AND NEW.status != 'approved' THEN
        RAISE EXCEPTION 'New % claims not requiring approval must start with approved status', resource_record.type;
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  -- Handle vote status transitions (special case, not in rules table)
  IF OLD.status = 'vote' THEN
    -- Vote can transition to: pending, going, cancelled
    IF NEW.status NOT IN ('pending', 'going', 'cancelled') THEN
      RAISE EXCEPTION 'Vote status can only transition to pending, going, or cancelled';
    END IF;

    -- Only claimant can cancel their vote
    IF NEW.status = 'cancelled' AND NOT user_is_claimant THEN
      RAISE EXCEPTION 'Only the claimant can cancel their vote';
    END IF;

    -- Only finalization function can convert to pending/going (done via SECURITY DEFINER)
    RETURN NEW;
  END IF;

  -- Terminal states cannot be changed
  IF OLD.status IN ('rejected', 'completed', 'cancelled', 'attended', 'flaked') THEN
    RAISE EXCEPTION 'Cannot transition from % status', OLD.status;
  END IF;

  -- Determine actor role
  actor_role := CASE
    WHEN user_is_owner THEN 'owner'
    WHEN user_is_claimant THEN 'claimant'
    ELSE 'none'
  END;

  -- Check if transition is valid using rules table
  SELECT EXISTS (
    SELECT 1
    FROM claim_status_transition_rules
    WHERE resource_type = resource_record.type
      AND from_status = OLD.status
      AND to_status = NEW.status
      AND allowed_actor = actor_role
  ) INTO is_valid_transition;

  -- If not valid, raise exception with helpful message
  IF NOT is_valid_transition THEN
    -- Check if transition exists but with wrong actor
    IF EXISTS (
      SELECT 1
      FROM claim_status_transition_rules
      WHERE resource_type = resource_record.type
        AND from_status = OLD.status
        AND to_status = NEW.status
    ) THEN
      RAISE EXCEPTION 'Only the % can transition % claims from % to %',
        (SELECT allowed_actor FROM claim_status_transition_rules
         WHERE resource_type = resource_record.type
           AND from_status = OLD.status
           AND to_status = NEW.status
         LIMIT 1),
        resource_record.type,
        OLD.status,
        NEW.status;
    ELSE
      RAISE EXCEPTION 'Invalid status transition for %: % → %',
        resource_record.type,
        OLD.status,
        NEW.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- PART 6: Complete Remaining Refactors
-- ============================================================================

-- 6.1: Drop old broken notify_new_resource function (5 params with wrong p_type parameter)
DROP FUNCTION IF EXISTS notify_new_resource(uuid, uuid, uuid, uuid, resource_type);

-- 6.2: Complete refactor for notify_on_resource_update - remove direct push call
CREATE OR REPLACE FUNCTION notify_on_resource_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  action_val action_type;
  claim_record RECORD;
  changes TEXT[];
BEGIN
  -- Determine what changed
  changes := ARRAY[]::TEXT[];

  IF OLD.title != NEW.title THEN
    changes := array_append(changes, 'title');
  END IF;

  IF OLD.description != NEW.description THEN
    changes := array_append(changes, 'description');
  END IF;

  IF OLD.status != NEW.status THEN
    changes := array_append(changes, 'status');
  END IF;

  -- Skip if nothing significant changed
  IF array_length(changes, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine notification type
  IF NEW.type = 'event' THEN
    action_val := 'event.updated';
  ELSE
    action_val := 'resource.updated';
  END IF;

  -- Notify all active claimants
  FOR claim_record IN
    SELECT rc.claimant_id
    FROM resource_claims rc
    WHERE rc.resource_id = NEW.id
      AND rc.status IN ('pending', 'approved', 'going', 'given')
      AND rc.claimant_id != NEW.owner_id
  LOOP
    -- Create notification - metadata built automatically including changes
    PERFORM create_notification_base(
      p_user_id := claim_record.claimant_id,
      p_action := action_val,
      p_actor_id := NEW.owner_id,
      p_resource_id := NEW.id,
      p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.id LIMIT 1),
      p_changes := changes
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- 6.3: Complete refactor for notify_on_resource_cancellation - remove direct push call
CREATE OR REPLACE FUNCTION notify_on_resource_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  claim_record RECORD;
BEGIN
  -- Only for events
  IF NEW.type != 'event' THEN
    RETURN NEW;
  END IF;

  -- Only when status changes to cancelled
  IF OLD.status = NEW.status OR NEW.status != 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Notify all active claimants
  FOR claim_record IN
    SELECT rc.claimant_id
    FROM resource_claims rc
    WHERE rc.resource_id = NEW.id
      AND rc.status IN ('pending', 'approved', 'going')
      AND rc.claimant_id != NEW.owner_id
  LOOP
    -- Create notification - metadata built automatically
    PERFORM create_notification_base(
      p_user_id := claim_record.claimant_id,
      p_action := 'event.cancelled',
      p_actor_id := NEW.owner_id,
      p_resource_id := NEW.id,
      p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.id LIMIT 1)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- PART 7: Cleanup Orphaned Functions
-- ============================================================================
-- Remove old notification functions that are no longer attached to any triggers
-- Must include full parameter signatures for PostgreSQL to match them

DROP FUNCTION IF EXISTS notify_claim(uuid, uuid, uuid, uuid, uuid);
DROP FUNCTION IF EXISTS notify_claim_approved(uuid, uuid, uuid, uuid, uuid);
DROP FUNCTION IF EXISTS notify_claim_cancelled(uuid, uuid, uuid, uuid, uuid);
DROP FUNCTION IF EXISTS notify_claim_completed(uuid, uuid, uuid, uuid, uuid);
DROP FUNCTION IF EXISTS notify_claim_rejected(uuid, uuid, uuid, uuid, uuid);
DROP FUNCTION IF EXISTS notify_comment(uuid, uuid, uuid, uuid, uuid, text);
DROP FUNCTION IF EXISTS notify_comment_reply(uuid, uuid, uuid, uuid, uuid, text);
DROP FUNCTION IF EXISTS notify_community_member_joined(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS notify_community_member_left(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS notify_connection_accepted(uuid, uuid);
DROP FUNCTION IF EXISTS notify_resource_cancelled(uuid, uuid, uuid, uuid);
DROP FUNCTION IF EXISTS notify_resource_updated(uuid, uuid, uuid, uuid, uuid, text[]);
DROP FUNCTION IF EXISTS notify_shoutout(uuid, uuid, uuid, uuid, text);
DROP FUNCTION IF EXISTS notify_trust_level_change(uuid, uuid, integer, integer);
DROP FUNCTION IF EXISTS notify_trust_points(uuid, uuid, integer, integer, integer);

-- These are trigger functions with no parameters
DROP FUNCTION IF EXISTS notify_new_message();
DROP FUNCTION IF EXISTS notify_on_message_received();
DROP FUNCTION IF EXISTS notify_on_trust_points();

-- Drop the in-app notification check function (always enabled now)
DROP FUNCTION IF EXISTS should_create_in_app_notification(UUID, action_type);

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Architecture now has clean separation:
-- 1. State validation driven by rules table (validate_claim_state_transition)
-- 2. Business logic determines WHO to notify (in 10 triggers)
-- 3. Metadata construction is automatic (create_notification_base)
-- 4. Notification record is created (just INSERT)
-- 5. Universal delivery handles HOW (push/email via one trigger)
--
-- All notification delivery logic is in ONE place: deliver_notification()
-- All metadata construction logic is in ONE place: create_notification_base()
-- All state transition rules are in ONE place: claim_status_transition_rules table
--
-- Active notification trigger functions:
-- - notify_on_claim
-- - notify_on_claim_status_change
-- - notify_on_comment
-- - notify_on_membership_change
-- - notify_on_new_conversation
-- - notify_on_new_message
-- - notify_on_resource_cancellation
-- - notify_on_resource_community_insert
-- - notify_on_resource_update
-- - notify_on_shoutout
-- - notify_on_trust_level_change
