-- Fix the notification trigger function to handle 'received' status and add ELSE clause

CREATE OR REPLACE FUNCTION public.notify_on_claim_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Notification for claim status changes (approved, rejected, interested, completed, cancelled)
  IF OLD.status != NEW.status THEN
    CASE NEW.status
      WHEN 'approved' THEN
        PERFORM create_notification(
          NEW.claimant_id,  -- Fixed: was NEW.user_id
          'claim_approved',
          (SELECT owner_id FROM resources WHERE id = NEW.resource_id), -- Fixed: was NULL
          'Claim approved',
          'Your claim has been approved.',
          NULL, -- action_url
          NEW.resource_id,
          NULL, -- comment_id
          NEW.id, -- claim_id
          NULL, -- message_id
          NULL, -- conversation_id
          NULL, -- community_id
          jsonb_build_object('claim_id', NEW.id)
        );
      WHEN 'interested' THEN
        -- For events, 'interested' status is equivalent to approval
        PERFORM create_notification(
          NEW.claimant_id,  -- Fixed: was NEW.user_id
          'claim_approved',
          (SELECT owner_id FROM resources WHERE id = NEW.resource_id), -- Fixed: was NULL
          'Registration approved',
          'Your event registration has been approved.',
          NULL, -- action_url
          NEW.resource_id,
          NULL, -- comment_id
          NEW.id, -- claim_id
          NULL, -- message_id
          NULL, -- conversation_id
          NULL, -- community_id
          jsonb_build_object('claim_id', NEW.id)
        );
      WHEN 'rejected' THEN
        PERFORM create_notification(
          NEW.claimant_id,  -- Fixed: was NEW.user_id
          'claim_rejected',
          (SELECT owner_id FROM resources WHERE id = NEW.resource_id), -- Fixed: was NULL
          'Claim rejected',
          'Your claim has been rejected.',
          NULL, -- action_url
          NEW.resource_id,
          NULL, -- comment_id
          NEW.id, -- claim_id
          NULL, -- message_id
          NULL, -- conversation_id
          NULL, -- community_id
          jsonb_build_object('claim_id', NEW.id)
        );
      WHEN 'completed' THEN
        -- Notify resource owner that claim was completed
        PERFORM create_notification(
          (SELECT owner_id FROM resources WHERE id = NEW.resource_id),  -- Fixed: was user_id
          'resource_claim_completed',
          NEW.claimant_id,  -- Fixed: was NEW.user_id
          'Claim completed',
          'Someone completed their claim on your resource.',
          NULL, -- action_url
          NEW.resource_id,
          NULL, -- comment_id
          NEW.id, -- claim_id
          NULL, -- message_id
          NULL, -- conversation_id
          NULL, -- community_id
          jsonb_build_object('claim_id', NEW.id)
        );
      WHEN 'given' THEN
        -- Notify claimant that resource has been marked as given
        PERFORM create_notification(
          NEW.claimant_id,
          'claimed_resource_updated',
          (SELECT owner_id FROM resources WHERE id = NEW.resource_id),
          'Resource marked as given',
          'The resource owner has marked your claimed resource as given.',
          NULL, -- action_url
          NEW.resource_id,
          NULL, -- comment_id
          NEW.id, -- claim_id
          NULL, -- message_id
          NULL, -- conversation_id
          NULL, -- community_id
          jsonb_build_object('claim_id', NEW.id, 'status', 'given')
        );
      WHEN 'received' THEN
        -- Notify resource owner that claimant has marked as received
        PERFORM create_notification(
          (SELECT owner_id FROM resources WHERE id = NEW.resource_id),
          'claimed_resource_updated',
          NEW.claimant_id,
          'Resource marked as received',
          'The claimant has marked your resource as received.',
          NULL, -- action_url
          NEW.resource_id,
          NULL, -- comment_id
          NEW.id, -- claim_id
          NULL, -- message_id
          NULL, -- conversation_id
          NULL, -- community_id
          jsonb_build_object('claim_id', NEW.id, 'status', 'received')
        );
      WHEN 'cancelled' THEN
        -- Notify resource owner that claim was cancelled
        PERFORM create_notification(
          (SELECT owner_id FROM resources WHERE id = NEW.resource_id),  -- Fixed: was user_id
          'resource_claim_cancelled',
          NEW.claimant_id,  -- Fixed: was NEW.user_id
          'Claim cancelled',
          'Someone cancelled their claim on your resource.',
          NULL, -- action_url
          NEW.resource_id,
          NULL, -- comment_id
          NEW.id, -- claim_id
          NULL, -- message_id
          NULL, -- conversation_id
          NULL, -- community_id
          jsonb_build_object('claim_id', NEW.id)
        );
      ELSE
        -- Handle any other status transitions without creating notifications
        NULL;
    END CASE;
  END IF;
  RETURN NEW;
END;
$$;