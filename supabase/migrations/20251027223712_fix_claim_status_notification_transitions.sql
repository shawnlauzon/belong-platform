-- Fix claim status notification transitions
-- Problem: Trigger was using 'going -> given' and 'given -> received' which are invalid
-- - 'going' is only for events (and events don't use 'given')
-- - 'given' and 'received' are parallel transitions from 'approved', not sequential
--
-- Correct transitions for offers/requests:
-- Path 1: approved -> given (notify receiver) -> completed (notify giver)
-- Path 2: approved -> received (notify giver) -> completed (notify receiver)
-- Events don't use given/received at all

CREATE OR REPLACE FUNCTION notify_on_claim_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  resource_owner_id UUID;
  resource_type_val resource_type;
  notification_id UUID;
  notification_metadata JSONB;
  action_to_notify action_type;
BEGIN
  -- Skip if status didn't change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get resource owner and type
  SELECT owner_id, type INTO resource_owner_id, resource_type_val
  FROM resources
  WHERE id = NEW.resource_id;

  -- Handle approved/rejected  claim.approved or claim.rejected
  IF NEW.status IN ('approved', 'rejected') THEN
    notification_metadata := jsonb_build_object('response', NEW.status::text);
    action_to_notify := CASE NEW.status
      WHEN 'approved' THEN 'claim.approved'::action_type
      ELSE 'claim.rejected'::action_type
    END;

    IF should_create_in_app_notification(NEW.claimant_id, action_to_notify) THEN
      notification_id := create_notification_base(
        p_user_id := NEW.claimant_id,
        p_action := action_to_notify,
        p_actor_id := resource_owner_id,
        p_resource_id := NEW.resource_id,
        p_claim_id := NEW.id,
        p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.resource_id LIMIT 1),
        p_metadata := notification_metadata
      );

      PERFORM send_push_notification_async(
        NEW.claimant_id,
        notification_id,
        action_to_notify,
        'Response to your claim',
        CASE NEW.status
          WHEN 'approved' THEN 'Your claim was approved'
          ELSE 'Your claim was rejected'
        END
      );
    END IF;
  END IF;

  -- Handle cancelled  claim.cancelled
  IF NEW.status = 'cancelled' AND should_create_in_app_notification(resource_owner_id, 'claim.cancelled') THEN
    notification_id := create_notification_base(
      p_user_id := resource_owner_id,
      p_action := 'claim.cancelled',
      p_actor_id := NEW.claimant_id,
      p_resource_id := NEW.resource_id,
      p_claim_id := NEW.id,
      p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.resource_id LIMIT 1)
    );

    PERFORM send_push_notification_async(
      resource_owner_id,
      notification_id,
      'claim.cancelled',
      'Claim cancelled',
      'A claim on your resource was cancelled'
    );
  END IF;

  -- Handle approved � given (for offers and requests only)
  -- Offers: owner gives � notify claimant
  -- Requests: claimant gives � notify owner
  IF OLD.status = 'approved' AND NEW.status = 'given' THEN
    IF resource_type_val = 'offer' THEN
      -- Owner marked as given, notify claimant to confirm receipt
      IF should_create_in_app_notification(NEW.claimant_id, 'resource.given') THEN
        notification_id := create_notification_base(
          p_user_id := NEW.claimant_id,
          p_action := 'resource.given',
          p_actor_id := resource_owner_id,
          p_resource_id := NEW.resource_id,
          p_claim_id := NEW.id,
          p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.resource_id LIMIT 1)
        );

        PERFORM send_push_notification_async(
          NEW.claimant_id,
          notification_id,
          'resource.given',
          'Resource marked as given',
          'Please confirm you received the resource'
        );
      END IF;
    ELSIF resource_type_val = 'request' THEN
      -- Claimant marked as given, notify owner to confirm receipt
      IF should_create_in_app_notification(resource_owner_id, 'resource.given') THEN
        notification_id := create_notification_base(
          p_user_id := resource_owner_id,
          p_action := 'resource.given',
          p_actor_id := NEW.claimant_id,
          p_resource_id := NEW.resource_id,
          p_claim_id := NEW.id,
          p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.resource_id LIMIT 1)
        );

        PERFORM send_push_notification_async(
          resource_owner_id,
          notification_id,
          'resource.given',
          'Resource marked as given',
          'Please confirm you received the resource'
        );
      END IF;
    END IF;
  END IF;

  -- Handle approved � received (for offers and requests only)
  -- Offers: claimant received � notify owner
  -- Requests: owner received � notify claimant
  IF OLD.status = 'approved' AND NEW.status = 'received' THEN
    IF resource_type_val = 'offer' THEN
      -- Claimant marked as received, notify owner to confirm
      IF should_create_in_app_notification(resource_owner_id, 'resource.received') THEN
        notification_id := create_notification_base(
          p_user_id := resource_owner_id,
          p_action := 'resource.received',
          p_actor_id := NEW.claimant_id,
          p_resource_id := NEW.resource_id,
          p_claim_id := NEW.id,
          p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.resource_id LIMIT 1)
        );

        PERFORM send_push_notification_async(
          resource_owner_id,
          notification_id,
          'resource.received',
          'Resource marked as received',
          'Please confirm the handoff is complete'
        );
      END IF;
    ELSIF resource_type_val = 'request' THEN
      -- Owner marked as received, notify claimant to confirm
      IF should_create_in_app_notification(NEW.claimant_id, 'resource.received') THEN
        notification_id := create_notification_base(
          p_user_id := NEW.claimant_id,
          p_action := 'resource.received',
          p_actor_id := resource_owner_id,
          p_resource_id := NEW.resource_id,
          p_claim_id := NEW.id,
          p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.resource_id LIMIT 1)
        );

        PERFORM send_push_notification_async(
          NEW.claimant_id,
          notification_id,
          'resource.received',
          'Resource marked as received',
          'Please confirm the handoff is complete'
        );
      END IF;
    END IF;
  END IF;

  -- Handle given � completed
  -- Offers: claimant confirms � notify owner
  -- Requests: owner confirms � notify claimant
  IF OLD.status = 'given' AND NEW.status = 'completed' THEN
    IF resource_type_val = 'offer' THEN
      -- Claimant confirmed receipt, notify owner
      IF should_create_in_app_notification(resource_owner_id, 'claim.completed') THEN
        notification_id := create_notification_base(
          p_user_id := resource_owner_id,
          p_action := 'claim.completed',
          p_actor_id := NEW.claimant_id,
          p_resource_id := NEW.resource_id,
          p_claim_id := NEW.id,
          p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.resource_id LIMIT 1)
        );

        PERFORM send_push_notification_async(
          resource_owner_id,
          notification_id,
          'claim.completed',
          'Claim completed',
          'The receiver confirmed they got the resource'
        );
      END IF;
    ELSIF resource_type_val = 'request' THEN
      -- Owner confirmed receipt, notify claimant
      IF should_create_in_app_notification(NEW.claimant_id, 'claim.completed') THEN
        notification_id := create_notification_base(
          p_user_id := NEW.claimant_id,
          p_action := 'claim.completed',
          p_actor_id := resource_owner_id,
          p_resource_id := NEW.resource_id,
          p_claim_id := NEW.id,
          p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.resource_id LIMIT 1)
        );

        PERFORM send_push_notification_async(
          NEW.claimant_id,
          notification_id,
          'claim.completed',
          'Claim completed',
          'The requester confirmed they received your help'
        );
      END IF;
    END IF;
  END IF;

  -- Handle received � completed
  -- Offers: owner confirms � notify claimant
  -- Requests: claimant confirms � notify owner
  IF OLD.status = 'received' AND NEW.status = 'completed' THEN
    IF resource_type_val = 'offer' THEN
      -- Owner confirmed handoff, notify claimant
      IF should_create_in_app_notification(NEW.claimant_id, 'claim.completed') THEN
        notification_id := create_notification_base(
          p_user_id := NEW.claimant_id,
          p_action := 'claim.completed',
          p_actor_id := resource_owner_id,
          p_resource_id := NEW.resource_id,
          p_claim_id := NEW.id,
          p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.resource_id LIMIT 1)
        );

        PERFORM send_push_notification_async(
          NEW.claimant_id,
          notification_id,
          'claim.completed',
          'Claim completed',
          'The giver confirmed the handoff'
        );
      END IF;
    ELSIF resource_type_val = 'request' THEN
      -- Claimant confirmed handoff, notify owner
      IF should_create_in_app_notification(resource_owner_id, 'claim.completed') THEN
        notification_id := create_notification_base(
          p_user_id := resource_owner_id,
          p_action := 'claim.completed',
          p_actor_id := NEW.claimant_id,
          p_resource_id := NEW.resource_id,
          p_claim_id := NEW.id,
          p_community_id := (SELECT community_id FROM resource_communities WHERE resource_id = NEW.resource_id LIMIT 1)
        );

        PERFORM send_push_notification_async(
          resource_owner_id,
          notification_id,
          'claim.completed',
          'Claim completed',
          'The helper confirmed you received their help'
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
