-- ============================================================================
-- MIGRATION: Fix Trust Score Triggers to Query action_points Table
-- Created: 2025-11-11
-- Purpose: Replace all hardcoded point values in trust score triggers with
--          queries to the action_points table for single source of truth
-- ============================================================================

-- ============================================================================
-- 1. Fix trust_score_on_membership_insert
-- ============================================================================
CREATE OR REPLACE FUNCTION trust_score_on_membership_insert()
RETURNS TRIGGER AS $$
DECLARE
  points_to_award INTEGER;
  action_type_to_use action_type;
BEGIN
  action_type_to_use := 'member.joined'::action_type;

  -- Query action_points table for the correct point value
  SELECT points INTO points_to_award
  FROM action_points
  WHERE action_type = action_type_to_use;

  -- Award same points for all roles (founder/organizer/member)
  PERFORM update_trust_score(
    NEW.user_id,
    NEW.community_id,
    action_type_to_use,
    NEW.community_id,
    points_to_award,
    jsonb_build_object(
      'trigger', 'member.joined',
      'role', NEW.role
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. Fix trust_score_on_membership_delete
-- ============================================================================
CREATE OR REPLACE FUNCTION trust_score_on_membership_delete()
RETURNS TRIGGER AS $$
DECLARE
  points_to_deduct INTEGER;
BEGIN
  -- Check if community still exists (handles cascade delete case)
  IF NOT EXISTS (SELECT 1 FROM communities WHERE id = OLD.community_id) THEN
    -- Community was deleted, skip trust score penalty
    RETURN OLD;
  END IF;

  -- Query action_points for member.joined and negate it
  SELECT -points INTO points_to_deduct
  FROM action_points
  WHERE action_type = 'member.joined'::action_type;

  -- Deduct points using member.joined action with is_inversed flag
  PERFORM update_trust_score(
    OLD.user_id,
    OLD.community_id,
    'member.joined'::action_type,
    OLD.community_id,
    points_to_deduct,
    jsonb_build_object(
      'trigger', 'member.left',
      'is_inversed', true
    )
  );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. Fix trust_score_on_resource_community_insert
-- ============================================================================
CREATE OR REPLACE FUNCTION trust_score_on_resource_community_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_resource RECORD;
  v_action_type action_type;
  v_points INTEGER;
BEGIN
  -- Get resource details
  SELECT type, owner_id, title
  INTO v_resource
  FROM resources
  WHERE id = NEW.resource_id;

  -- Determine action_type based on resource type
  IF v_resource.type = 'offer' THEN
    v_action_type := 'resource.offer.created'::action_type;
  ELSIF v_resource.type = 'request' THEN
    v_action_type := 'resource.request.created'::action_type;
  ELSIF v_resource.type = 'event' THEN
    v_action_type := 'resource.event.created'::action_type;
  ELSE
    -- Unknown resource type, skip
    RETURN NEW;
  END IF;

  -- Query action_points for the correct point value
  SELECT points INTO v_points
  FROM action_points
  WHERE action_type = v_action_type;

  -- Award points for this community association
  PERFORM update_trust_score(
    v_resource.owner_id,
    NEW.community_id,
    v_action_type,
    NEW.resource_id,
    v_points,
    jsonb_build_object(
      'trigger', 'resource.created',
      'resource_type', v_resource.type,
      'resource_title', v_resource.title
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. Fix trust_score_on_claim_insert
-- ============================================================================
CREATE OR REPLACE FUNCTION trust_score_on_claim_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_resource RECORD;
  v_community_id UUID;
  v_points INTEGER;
  v_action_type action_type;
BEGIN
  -- Get resource details
  SELECT r.type, r.owner_id, r.title, r.requires_approval
  INTO v_resource
  FROM resources r
  JOIN resource_timeslots rt ON rt.resource_id = r.id
  WHERE rt.id = NEW.timeslot_id;

  -- Only award points if status is approved
  IF NEW.status != 'approved' THEN
    RETURN NEW;
  END IF;

  -- Determine action_type based on resource type
  IF v_resource.type = 'event' THEN
    v_action_type := 'claim.event.going'::action_type;
  ELSIF v_resource.type = 'offer' THEN
    v_action_type := 'claim.offer.created'::action_type;
  ELSIF v_resource.type = 'request' THEN
    v_action_type := 'claim.request.created'::action_type;
  ELSE
    -- Unknown resource type, skip
    RETURN NEW;
  END IF;

  -- Query action_points for the correct point value
  SELECT points INTO v_points
  FROM action_points
  WHERE action_type = v_action_type;

  -- Award points for each community the resource is associated with
  FOR v_community_id IN
    SELECT rc.community_id
    FROM resource_communities rc
    JOIN resource_timeslots rt ON rt.resource_id = rc.resource_id
    WHERE rt.id = NEW.timeslot_id
  LOOP
    PERFORM update_trust_score(
      NEW.claimant_id,
      v_community_id,
      v_action_type,
      NEW.id,
      v_points,
      jsonb_build_object(
        'trigger', 'claim.created',
        'resource_type', v_resource.type,
        'resource_title', v_resource.title,
        'status', NEW.status,
        'auto_approved', NOT v_resource.requires_approval
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. Fix trust_score_on_claim_update
-- ============================================================================
CREATE OR REPLACE FUNCTION trust_score_on_claim_update()
RETURNS TRIGGER AS $$
DECLARE
  v_resource RECORD;
  v_community_id UUID;
  v_points INTEGER;
  v_action_type action_type;
  v_metadata JSONB;
BEGIN
  -- Get resource details
  SELECT r.type, r.owner_id, r.title
  INTO v_resource
  FROM resources r
  JOIN resource_timeslots rt ON rt.resource_id = r.id
  WHERE rt.id = NEW.timeslot_id;

  -- Determine action based on resource type and status change
  IF v_resource.type = 'event' THEN
    -- Events have different states
    IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
      v_action_type := 'claim.event.going'::action_type;
    ELSIF OLD.status = 'approved' AND NEW.status = 'going' THEN
      v_action_type := 'claim.event.going'::action_type;
    ELSIF OLD.status = 'going' AND NEW.status = 'attended' THEN
      v_action_type := 'claim.event.attended'::action_type;
    ELSE
      -- No points for other transitions
      RETURN NEW;
    END IF;
  ELSE
    -- Offers and Requests
    IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
      IF v_resource.type = 'offer' THEN
        v_action_type := 'claim.offer.created'::action_type;
      ELSE
        v_action_type := 'claim.request.created'::action_type;
      END IF;
    ELSIF (OLD.status = 'given' OR OLD.status = 'received') AND NEW.status = 'completed' THEN
      IF v_resource.type = 'offer' THEN
        v_action_type := 'resource.offer.given'::action_type;
      ELSE
        v_action_type := 'claim.request.completed'::action_type;
      END IF;
    ELSE
      -- No points for other transitions
      RETURN NEW;
    END IF;
  END IF;

  -- Query action_points for the correct point value
  SELECT points INTO v_points
  FROM action_points
  WHERE action_type = v_action_type;

  v_metadata := jsonb_build_object(
    'trigger', 'claim.updated',
    'resource_type', v_resource.type,
    'resource_title', v_resource.title,
    'old_status', OLD.status,
    'new_status', NEW.status
  );

  -- Award points for each community the resource is associated with
  FOR v_community_id IN
    SELECT rc.community_id
    FROM resource_communities rc
    JOIN resource_timeslots rt ON rt.resource_id = rc.resource_id
    WHERE rt.id = NEW.timeslot_id
  LOOP
    PERFORM update_trust_score(
      NEW.claimant_id,
      v_community_id,
      v_action_type,
      NEW.id,
      v_points,
      v_metadata
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. Fix trust_score_on_shoutout_insert
-- ============================================================================
CREATE OR REPLACE FUNCTION trust_score_on_shoutout_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_resource_type TEXT;
  v_receiver_action_type action_type;
  v_sender_action_type action_type;
  v_receiver_points INTEGER;
  v_sender_points INTEGER;
  v_receiver_role TEXT;
  v_sender_role TEXT;
BEGIN
  -- Determine resource type and roles from the shoutout context
  SELECT r.type INTO v_resource_type
  FROM resources r
  WHERE r.id = NEW.resource_id;

  -- Check if resource was found
  IF v_resource_type IS NULL THEN
    RAISE LOG 'trust_score_on_shoutout_insert: Resource not found for shoutout %, resource_id %',
      NEW.id, NEW.resource_id;
    RETURN NEW;
  END IF;

  -- Determine if sender/receiver is owner or claimant
  SELECT
    CASE WHEN r.owner_id = NEW.receiver_id THEN 'owner' ELSE 'claimant' END,
    CASE WHEN r.owner_id = NEW.sender_id THEN 'owner' ELSE 'claimant' END
  INTO v_receiver_role, v_sender_role
  FROM resources r
  WHERE r.id = NEW.resource_id;

  -- Build action_types for receiver and sender
  v_receiver_action_type := ('shoutout.' || v_resource_type || '.received.' || v_receiver_role)::action_type;
  v_sender_action_type := ('shoutout.' || v_resource_type || '.sent.' || v_sender_role)::action_type;

  -- Query action_points for receiver
  SELECT points INTO v_receiver_points
  FROM action_points
  WHERE action_type = v_receiver_action_type;

  -- Query action_points for sender
  SELECT points INTO v_sender_points
  FROM action_points
  WHERE action_type = v_sender_action_type;

  -- Check if points were found
  IF v_receiver_points IS NULL THEN
    RAISE LOG 'trust_score_on_shoutout_insert: No points configured for action_type %', v_receiver_action_type;
    RETURN NEW;
  END IF;

  IF v_sender_points IS NULL THEN
    RAISE LOG 'trust_score_on_shoutout_insert: No points configured for action_type %', v_sender_action_type;
    RETURN NEW;
  END IF;

  -- Award points to receiver
  PERFORM update_trust_score(
    NEW.receiver_id,
    NEW.community_id,
    v_receiver_action_type,
    NEW.id,
    v_receiver_points,
    jsonb_build_object(
      'trigger', 'shoutout.received',
      'role', v_receiver_role,
      'sender_id', NEW.sender_id,
      'resource_type', v_resource_type
    )
  );

  -- Award points to sender
  PERFORM update_trust_score(
    NEW.sender_id,
    NEW.community_id,
    v_sender_action_type,
    NEW.id,
    v_sender_points,
    jsonb_build_object(
      'trigger', 'shoutout.sent',
      'role', v_sender_role,
      'receiver_id', NEW.receiver_id,
      'resource_type', v_resource_type
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. Fix update_trust_score to handle is_inversed flag
-- ============================================================================
CREATE OR REPLACE FUNCTION update_trust_score(
  p_user_id UUID,
  p_community_id UUID,
  p_action_type action_type,
  p_action_id UUID,
  p_points_change INTEGER,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
DECLARE
  current_score INTEGER := 0;
  new_score INTEGER;
  old_score INTEGER;
  v_is_inversed BOOLEAN;
BEGIN
  -- Get current score for this user in this community
  SELECT score INTO current_score
  FROM trust_scores
  WHERE user_id = p_user_id AND community_id = p_community_id;

  old_score := COALESCE(current_score, 0);
  new_score := old_score + p_points_change;

  -- Insert or update trust score
  INSERT INTO trust_scores (user_id, community_id, score, last_calculated_at, created_at, updated_at)
  VALUES (p_user_id, p_community_id, new_score, NOW(), NOW(), NOW())
  ON CONFLICT (user_id, community_id)
  DO UPDATE SET
    score = new_score,
    last_calculated_at = NOW(),
    updated_at = NOW();

  -- Extract is_inversed from metadata, default to false
  v_is_inversed := COALESCE((p_metadata->>'is_inversed')::boolean, false);

  -- Log the trust score change with is_inversed flag
  INSERT INTO trust_score_logs (
    user_id, community_id, action_type, action_id,
    points_change, score_before, score_after, is_inversed, metadata, created_at
  ) VALUES (
    p_user_id, p_community_id, p_action_type, p_action_id,
    p_points_change, old_score, new_score, v_is_inversed, p_metadata, NOW()
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in update_trust_score for user % community %: %',
      p_user_id, p_community_id, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
