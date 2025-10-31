-- Drop and recreate notification_details view to add actor info to metadata
-- Remove actor_display_name and actor_avatar_url columns, add them to metadata instead
DROP VIEW IF EXISTS notification_details;

CREATE VIEW notification_details AS
SELECT
    n.id,
    n.user_id,
    n.action,
    n.resource_id,
    n.comment_id,
    n.claim_id,
    n.community_id,
    n.shoutout_id,
    n.conversation_id,
    n.actor_id,
    -- Merge actor info into metadata
    CASE
        WHEN n.actor_id IS NOT NULL THEN
            COALESCE(n.metadata, '{}'::jsonb) || jsonb_build_object(
                'actor_display_name', up_actor.full_name,
                'actor_full_name', up_actor.full_name,
                'actor_avatar_url', up_actor.avatar_url
            )
        ELSE n.metadata
    END AS metadata,
    n.read_at,
    n.created_at,
    n.updated_at,
    r.title AS resource_title,
    r.type AS resource_type,
    r.image_urls[1] AS resource_image_url,
    c.name AS community_name,
    comm.content AS comment_content,
    s.message AS shoutout_message,
    CASE
        WHEN n.claim_id IS NOT NULL THEN (
            SELECT jsonb_build_object(
                'resource_id', rc_1.resource_id,
                'timeslot_id', rc_1.timeslot_id,
                'timeslot_start_time', ts.start_time,
                'timeslot_end_time', ts.end_time,
                'status', rc_1.status,
                'commitment_level', rc_1.commitment_level,
                'resource_title', r_1.title,
                'resource_type', r_1.type,
                'claimant_name', pp.full_name,
                'owner_name', po.full_name
            )
            FROM resource_claims rc_1
            JOIN resources r_1 ON r_1.id = rc_1.resource_id
            JOIN public_profiles pp ON pp.id = rc_1.claimant_id
            JOIN public_profiles po ON po.id = r_1.owner_id
            LEFT JOIN resource_timeslots ts ON ts.id = rc_1.timeslot_id
            WHERE rc_1.id = n.claim_id
        )
        ELSE NULL
    END AS claim_details
FROM notifications n
LEFT JOIN public_profiles up_actor ON n.actor_id = up_actor.id
LEFT JOIN resources r ON n.resource_id = r.id
LEFT JOIN communities c ON n.community_id = c.id
LEFT JOIN comments comm ON n.comment_id = comm.id
LEFT JOIN shoutouts s ON n.shoutout_id = s.id;

-- Update notify_new_resource function to add event metadata
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
  v_metadata JSONB;
  v_resource RECORD;
BEGIN
  -- Determine notification type based on resource type
  IF p_resource_type = 'event' THEN
    action_val := 'event.created';

    -- Get resource details for event metadata
    SELECT r.status, r.voting_deadline, rt.start_time, rt.end_time
    INTO v_resource
    FROM resources r
    LEFT JOIN resource_timeslots rt ON rt.resource_id = r.id AND rt.is_available = TRUE
    WHERE r.id = p_resource_id
    LIMIT 1;

    -- Build event metadata
    v_metadata := jsonb_build_object(
      'resource_status', v_resource.status,
      'voting_deadline', v_resource.voting_deadline,
      'timeslot_start_time', v_resource.start_time,
      'timeslot_end_time', v_resource.end_time
    );
  ELSE
    action_val := 'resource.created';
    v_metadata := NULL;
  END IF;

  notification_id := create_notification_base(
    p_user_id := p_user_id,
    p_action := action_val,
    p_actor_id := p_actor_id,
    p_resource_id := p_resource_id,
    p_community_id := p_community_id,
    p_metadata := v_metadata
  );

  -- Send push notification
  PERFORM send_push_notification_async(
    p_user_id,
    notification_id,
    action_val,
    CASE WHEN p_resource_type = 'event' THEN 'New event' ELSE 'New resource' END,
    p_resource_title
  );

  RETURN notification_id;
END;
$$;

-- Update notify_on_resource_update to add event metadata
CREATE OR REPLACE FUNCTION notify_on_resource_update()
RETURNS TRIGGER AS $$
DECLARE
  action_val action_type;
  claim_record RECORD;
  changes TEXT[];
  notification_id UUID;
  v_metadata JSONB;
  v_timeslot RECORD;
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
    SELECT rc.claimant_id, rt.start_time, rt.end_time
    FROM resource_claims rc
    LEFT JOIN resource_timeslots rt ON rt.id = rc.timeslot_id
    WHERE rc.resource_id = NEW.id
      AND rc.status IN ('pending', 'approved', 'going', 'given')
      AND rc.claimant_id != NEW.owner_id
  LOOP
    -- Build metadata
    IF NEW.type = 'event' THEN
      v_metadata := jsonb_build_object(
        'changes', changes,
        'resource_status', NEW.status,
        'voting_deadline', NEW.voting_deadline,
        'timeslot_start_time', claim_record.start_time,
        'timeslot_end_time', claim_record.end_time
      );
    ELSE
      v_metadata := jsonb_build_object('changes', changes);
    END IF;

    notification_id := create_notification_base(
      p_user_id := claim_record.claimant_id,
      p_action := action_val,
      p_actor_id := NEW.owner_id,
      p_resource_id := NEW.id,
      p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.id LIMIT 1),
      p_metadata := v_metadata
    );

    PERFORM send_push_notification_async(
      claim_record.claimant_id,
      notification_id,
      action_val,
      CASE WHEN NEW.type = 'event' THEN 'Event updated' ELSE 'Resource updated' END,
      NEW.title
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update notify_on_resource_cancellation to add event metadata
CREATE OR REPLACE FUNCTION notify_on_resource_cancellation()
RETURNS TRIGGER AS $$
DECLARE
  claim_record RECORD;
  notification_id UUID;
  v_metadata JSONB;
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
    SELECT rc.claimant_id, rt.start_time, rt.end_time
    FROM resource_claims rc
    LEFT JOIN resource_timeslots rt ON rt.id = rc.timeslot_id
    WHERE rc.resource_id = NEW.id
      AND rc.status IN ('pending', 'approved', 'going')
      AND rc.claimant_id != NEW.owner_id
  LOOP
    v_metadata := jsonb_build_object(
      'resource_status', NEW.status,
      'voting_deadline', NEW.voting_deadline,
      'timeslot_start_time', claim_record.start_time,
      'timeslot_end_time', claim_record.end_time
    );

    notification_id := create_notification_base(
      p_user_id := claim_record.claimant_id,
      p_action := 'event.cancelled',
      p_actor_id := NEW.owner_id,
      p_resource_id := NEW.id,
      p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.id LIMIT 1),
      p_metadata := v_metadata
    );

    PERFORM send_push_notification_async(
      claim_record.claimant_id,
      notification_id,
      'event.cancelled',
      'Event cancelled',
      NEW.title || ' has been cancelled'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
