-- Drop the existing notification_details view
DROP VIEW IF EXISTS public.notification_details;

-- Recreate the notification_details view with community_data instead of community_name
CREATE VIEW public.notification_details AS
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
    n.read_at,
    n.created_at,
    n.updated_at,
    n.changes,
    CASE
        WHEN n.actor_id IS NOT NULL THEN jsonb_build_object(
            'display_name', COALESCE(up_actor.first_name, up_actor.full_name),
            'full_name', COALESCE(up_actor.full_name,
                CASE
                    WHEN up_actor.last_name IS NOT NULL THEN (up_actor.first_name || ' '::text) || up_actor.last_name
                    ELSE up_actor.first_name
                END),
            'avatar_url', up_actor.avatar_url
        )
        ELSE NULL::jsonb
    END AS actor_data,
    CASE
        WHEN n.resource_id IS NOT NULL THEN jsonb_build_object(
            'title', r.title,
            'type', r.type,
            'status', r.status,
            'voting_deadline', r.voting_deadline,
            'image_url', r.image_urls[1],
            'timeslot_start_time', rt.start_time,
            'timeslot_end_time', rt.end_time
        )
        ELSE NULL::jsonb
    END AS resource_data,
    CASE
        WHEN n.comment_id IS NOT NULL THEN jsonb_build_object(
            'content_preview', "left"(comm.content, 200)
        )
        ELSE NULL::jsonb
    END AS comment_data,
    CASE
        WHEN n.claim_id IS NOT NULL THEN (
            SELECT jsonb_build_object(
                'status', rc.status,
                'commitment_level', rc.commitment_level,
                'timeslot_id', rc.timeslot_id,
                'timeslot_start_time', ts.start_time,
                'timeslot_end_time', ts.end_time,
                'resource_id', rc.resource_id,
                'resource_title', r_claim.title,
                'resource_type', r_claim.type,
                'claimant_id', rc.claimant_id,
                'claimant_name', pp.full_name,
                'owner_id', r_claim.owner_id,
                'owner_name', po.full_name
            )
            FROM resource_claims rc
            JOIN resources r_claim ON r_claim.id = rc.resource_id
            JOIN public_profiles pp ON pp.id = rc.claimant_id
            JOIN public_profiles po ON po.id = r_claim.owner_id
            LEFT JOIN resource_timeslots ts ON ts.id = rc.timeslot_id
            WHERE rc.id = n.claim_id
        )
        ELSE NULL::jsonb
    END AS claim_data,
    CASE
        WHEN n.community_id IS NOT NULL THEN jsonb_build_object(
            'name', c.name,
            'time_zone', c.time_zone,
            'icon', c.icon,
            'color', c.color,
            'type', c.type,
            'description', c.description,
            'banner_image_url', c.banner_image_url
        )
        ELSE NULL::jsonb
    END AS community_data,
    s.message AS shoutout_message
FROM notifications n
LEFT JOIN public_profiles up_actor ON n.actor_id = up_actor.id
LEFT JOIN resources r ON n.resource_id = r.id
LEFT JOIN LATERAL (
    SELECT resource_timeslots.start_time,
           resource_timeslots.end_time
    FROM resource_timeslots
    WHERE resource_timeslots.resource_id = r.id
    ORDER BY resource_timeslots.start_time
    LIMIT 1
) rt ON true
LEFT JOIN communities c ON n.community_id = c.id
LEFT JOIN comments comm ON n.comment_id = comm.id
LEFT JOIN shoutouts s ON n.shoutout_id = s.id;
