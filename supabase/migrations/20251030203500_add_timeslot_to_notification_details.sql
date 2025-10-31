-- Drop existing notification_details view
DROP VIEW IF EXISTS notification_details;

-- Recreate notification_details view with timeslot information
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
  n.metadata,
  n.read_at,
  n.created_at,
  n.updated_at,
  up_actor.full_name AS actor_display_name,
  up_actor.avatar_url AS actor_avatar_url,
  COALESCE(n.metadata->>'resource_title', r.title) AS resource_title,
  r.type AS resource_type,
  c.name AS community_name,
  c.icon AS community_avatar_url,
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
    ELSE NULL::jsonb
  END AS claim_details
FROM notifications n
LEFT JOIN public_profiles up_actor ON n.actor_id = up_actor.id
LEFT JOIN resources r ON n.resource_id = r.id
LEFT JOIN communities c ON n.community_id = c.id
LEFT JOIN comments comm ON n.comment_id = comm.id
LEFT JOIN shoutouts s ON n.shoutout_id = s.id;
