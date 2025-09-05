-- Fix notification_details view that was regressed in the commitment level migration
-- The previous migration removed all the LEFT JOINs and additional fields that provide
-- actor, resource, community, comment, and shoutout information

DROP VIEW IF EXISTS notification_details;

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
  
  -- Actor information
  up_actor.full_name as actor_display_name,
  up_actor.avatar_url as actor_avatar_url,
  
  -- Resource information
  r.title as resource_title,
  r.type as resource_type,
  
  -- Community information
  c.name as community_name,
  c.icon as community_avatar_url,
  
  -- Comment information
  comm.content as comment_content,
  
  -- Shoutout information  
  s.message as shoutout_message,
  
  -- Claim information
  rc.status as claim_status,
  
  -- Resource claim related fields (keeping the existing claim_details field)
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
  
FROM notifications n
LEFT JOIN public_profiles up_actor ON n.actor_id = up_actor.id
LEFT JOIN resources r ON n.resource_id = r.id
LEFT JOIN communities c ON n.community_id = c.id
LEFT JOIN comments comm ON n.comment_id = comm.id
LEFT JOIN shoutouts s ON n.shoutout_id = s.id
LEFT JOIN resource_claims rc ON n.claim_id = rc.id;