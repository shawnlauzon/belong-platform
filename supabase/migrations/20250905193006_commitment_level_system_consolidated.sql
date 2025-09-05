-- Consolidated migration: Add commitment level system and update resource claim status enum
-- This migration combines multiple changes:
-- 1. Add commitment_level field with enum
-- 2. Remove 'interested' and 'received' from status enum  
-- 3. Add 'flaked' status back for events
-- 4. Update all database functions and triggers
-- 5. Migrate existing data
BEGIN;

-- Create the commitment level enum
CREATE TYPE commitment_level_enum AS ENUM ('interested', 'committed');

-- Add commitment_level column to resource_claims table
ALTER TABLE resource_claims 
ADD COLUMN commitment_level commitment_level_enum DEFAULT 'interested';

-- Temporarily disable the validation trigger to allow data migration
ALTER TABLE resource_claims DISABLE TRIGGER validate_claim_transition_trigger;

-- Update existing records with 'interested' status to have proper commitment_level and new status
UPDATE resource_claims 
SET 
  commitment_level = 'interested',
  status = CASE 
    WHEN status = 'interested' THEN 'approved'::resource_claim_status
    ELSE status
  END
WHERE status = 'interested';

-- Re-enable the validation trigger
ALTER TABLE resource_claims ENABLE TRIGGER validate_claim_transition_trigger;

-- Remove 'interested' and 'received' from the resource_claim_status enum, add 'flaked'
-- First create a new enum without the removed statuses but with flaked
CREATE TYPE resource_claim_status_new AS ENUM (
  'pending',
  'approved', 
  'rejected',
  'completed',
  'cancelled',
  'given',
  'going',
  'attended',
  'flaked'
);

-- Drop policies and views that depend on the status column
DROP POLICY IF EXISTS "Claim users can manage their claim status" ON resource_claims;
DROP POLICY IF EXISTS "Resource owners can manage workflow states except cancelled" ON resource_claims;
DROP VIEW IF EXISTS notification_details;

-- Update the column to use the new enum, dropping the default first
ALTER TABLE resource_claims ALTER COLUMN status DROP DEFAULT;
ALTER TABLE resource_claims 
ALTER COLUMN status TYPE resource_claim_status_new 
USING status::text::resource_claim_status_new;

-- Drop the old enum and rename the new one
DROP TYPE resource_claim_status;
ALTER TYPE resource_claim_status_new RENAME TO resource_claim_status;

-- Recreate the policies with the new enum
CREATE POLICY "Claim users can manage their claim status" ON resource_claims
FOR UPDATE USING (
  auth.uid() = claimant_id OR 
  auth.uid() IN (
    SELECT owner_id FROM resources WHERE id = resource_id
  )
) WITH CHECK (
  auth.uid() = claimant_id OR 
  auth.uid() IN (
    SELECT owner_id FROM resources WHERE id = resource_id
  )
);

CREATE POLICY "Resource owners can manage workflow states except cancelled" ON resource_claims
FOR UPDATE USING (
  auth.uid() IN (
    SELECT owner_id FROM resources WHERE id = resource_id
  ) AND status != 'cancelled'
) WITH CHECK (
  auth.uid() IN (
    SELECT owner_id FROM resources WHERE id = resource_id
  )
);

-- Recreate notification_details view with updated status enum and correct column names
CREATE VIEW notification_details AS
SELECT 
  n.id,
  n.user_id,
  n.type,
  n.resource_id,
  n.comment_id,
  n.claim_id,
  n.community_id,
  n.actor_id,
  n.metadata,
  n.is_read,
  n.read_at,
  n.created_at,
  n.updated_at,
  n.shoutout_id,
  -- Resource claim related fields
  CASE 
    WHEN n.claim_id IS NOT NULL THEN (
      SELECT jsonb_build_object(
        'resource_id', rc.resource_id,
        'timeslot_id', rc.timeslot_id,
        'status', rc.status,
        'commitment_level', rc.commitment_level,
        'resource_title', r.title,
        'resource_type', r.type,
        'claimant_name', pp.full_name,
        'owner_name', po.full_name
      )
      FROM resource_claims rc
      JOIN resources r ON r.id = rc.resource_id
      JOIN public_profiles pp ON pp.id = rc.claimant_id
      JOIN public_profiles po ON po.id = r.owner_id
      WHERE rc.id = n.claim_id
    )
  END as claim_details
FROM notifications n;

-- Update the validation function to handle commitment_level and new status system
CREATE OR REPLACE FUNCTION validate_claim_state_transition()
RETURNS TRIGGER AS $$
DECLARE
  resource_record RECORD;
  user_is_owner BOOLEAN := FALSE;
  user_is_claimant BOOLEAN := FALSE;
BEGIN
  -- Get resource information
  SELECT r.type, r.requires_approval, r.owner_id
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

  -- Terminal states cannot be changed
  IF OLD.status IN ('rejected', 'completed', 'cancelled', 'attended', 'flaked') THEN
    RAISE EXCEPTION 'Cannot transition from % status', OLD.status;
  END IF;

  -- Only owner can approve, reject
  IF NEW.status IN ('approved', 'rejected') THEN
    IF NOT user_is_owner THEN
      RAISE EXCEPTION 'Only resource owner can approve or reject claims';
    END IF;
    IF OLD.status != 'pending' THEN
      RAISE EXCEPTION 'Can only approve or reject pending claims';
    END IF;
  END IF;

  -- Resource type specific validations
  IF resource_record.type = 'event' THEN
    -- Event-specific transitions (includes flaked status)
    CASE 
      WHEN OLD.status = 'approved' AND NEW.status = 'going' THEN
        IF NOT user_is_claimant THEN
          RAISE EXCEPTION 'Only the attendee can confirm they are going';
        END IF;
      WHEN OLD.status = 'going' AND NEW.status IN ('attended', 'flaked') THEN
        IF NOT user_is_owner THEN
          RAISE EXCEPTION 'Only event owner can mark attendance or flaked';
        END IF;
      WHEN NEW.status = 'cancelled' THEN
        IF NOT user_is_claimant THEN
          RAISE EXCEPTION 'Only the attendee can cancel their registration';
        END IF;
      ELSE
        -- Check for invalid transitions (includes flaked)
        IF NOT (
          (OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected')) OR
          (OLD.status = 'approved' AND NEW.status IN ('going', 'cancelled')) OR
          (OLD.status = 'going' AND NEW.status IN ('attended', 'flaked', 'cancelled'))
        ) THEN
          RAISE EXCEPTION 'Invalid status transition for event: % -> %', OLD.status, NEW.status;
        END IF;
    END CASE;
    
  ELSIF resource_record.type = 'offer' THEN
    -- Offer-specific transitions (removed 'received' status)
    CASE
      WHEN OLD.status = 'approved' AND NEW.status = 'given' THEN
        IF NOT user_is_owner THEN
          RAISE EXCEPTION 'Only resource owner can mark an offer as given';
        END IF;
      WHEN OLD.status = 'given' AND NEW.status = 'completed' THEN
        IF NOT user_is_claimant THEN
          RAISE EXCEPTION 'Only claimant can complete a given offer';
        END IF;
      WHEN NEW.status = 'cancelled' THEN
        IF NOT user_is_claimant THEN
          RAISE EXCEPTION 'Only claimant can cancel their claim';
        END IF;
      ELSE
        -- Check for invalid transitions (removed 'received' status)
        IF NOT (
          (OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected')) OR
          (OLD.status = 'approved' AND NEW.status IN ('given', 'cancelled')) OR
          (OLD.status = 'given' AND NEW.status = 'completed')
        ) THEN
          RAISE EXCEPTION 'Invalid status transition for offer: % -> %', OLD.status, NEW.status;
        END IF;
    END CASE;
    
  ELSIF resource_record.type = 'request' THEN
    -- Request-specific transitions (removed 'received' status)
    CASE
      WHEN OLD.status = 'approved' AND NEW.status = 'given' THEN
        IF NOT user_is_claimant THEN
          RAISE EXCEPTION 'Only claimant can mark a request as given';
        END IF;
      WHEN OLD.status = 'given' AND NEW.status = 'completed' THEN
        IF NOT user_is_owner THEN
          RAISE EXCEPTION 'Only owner can complete a given request';
        END IF;
      WHEN NEW.status = 'cancelled' THEN
        IF NOT user_is_claimant THEN
          RAISE EXCEPTION 'Only claimant can cancel their claim';
        END IF;
      ELSE
        -- Check for invalid transitions (removed 'received' status)
        IF NOT (
          (OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected')) OR
          (OLD.status = 'approved' AND NEW.status IN ('given', 'cancelled')) OR
          (OLD.status = 'given' AND NEW.status = 'completed')
        ) THEN
          RAISE EXCEPTION 'Invalid status transition for request: % -> %', OLD.status, NEW.status;
        END IF;
    END CASE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix trust_score_on_claim_update function to work with new status system
CREATE OR REPLACE FUNCTION trust_score_on_claim_update()
RETURNS TRIGGER AS $$
DECLARE
  v_resource RECORD;
  v_community_id UUID;
  v_points INTEGER;
  v_action_type TEXT;
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
    -- Events have different states (no more 'interested' status)
    IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
      v_action_type := 'resource_claim';
      v_points := 5;
    ELSIF OLD.status = 'approved' AND NEW.status = 'going' THEN
      v_action_type := 'resource_claim';
      v_points := 25;
    ELSIF OLD.status = 'going' AND NEW.status = 'attended' THEN
      v_action_type := 'resource_completion';
      v_points := 50;
    ELSE
      -- No points for other transitions
      RETURN NEW;
    END IF;
  ELSE
    -- Offers and Requests (no more 'received' status)
    IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
      v_action_type := 'resource_claim';
      v_points := 25;
    ELSIF OLD.status = 'given' AND NEW.status = 'completed' THEN
      v_action_type := 'resource_completion';
      v_points := 50;
    ELSE
      -- No points for other transitions
      RETURN NEW;
    END IF;
  END IF;

  v_metadata := jsonb_build_object(
    'trigger', 'resource_claim_update',
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
      v_action_type::trust_score_action_type,
      NEW.id,
      v_points,
      v_metadata
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix trust_score_on_claim_insert function to work with new status system
CREATE OR REPLACE FUNCTION trust_score_on_claim_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_resource RECORD;
  v_community_id UUID;
  v_points INTEGER;
BEGIN
  -- Get resource details
  SELECT r.type, r.owner_id, r.title, r.requires_approval
  INTO v_resource
  FROM resources r
  JOIN resource_timeslots rt ON rt.resource_id = r.id
  WHERE rt.id = NEW.timeslot_id;

  -- Determine points based on initial status (no more 'interested' status)
  IF v_resource.type = 'event' THEN
    -- Events that don't require approval start as 'approved' and get 5 points
    IF NEW.status = 'approved' THEN
      v_points := 5;
    ELSE
      -- 'pending' events don't get points until approved
      RETURN NEW;
    END IF;
  ELSE
    -- Offers/Requests that don't require approval start as 'approved' and get 25 points
    IF NEW.status = 'approved' THEN
      v_points := 25;
    ELSE
      -- 'pending' claims don't get points until approved
      RETURN NEW;
    END IF;
  END IF;

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
      'resource_claim'::trust_score_action_type,
      NEW.id,
      v_points,
      jsonb_build_object(
        'trigger', 'resource_claim_insert',
        'resource_type', v_resource.type,
        'resource_title', v_resource.title,
        'status', NEW.status,
        'auto_approved', NOT v_resource.requires_approval
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix notify_on_claim_status_change function to work with new status system
CREATE OR REPLACE FUNCTION notify_on_claim_status_change()
RETURNS TRIGGER AS $$
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
  
  -- Handle different status changes (removed 'interested' case)
  CASE NEW.status
    WHEN 'approved' THEN
      -- Notify claimant their claim was approved (handles both offers and events)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;