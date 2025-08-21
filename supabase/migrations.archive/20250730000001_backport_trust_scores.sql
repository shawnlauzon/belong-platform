/*
  # Backport Trust Scores for Historical Actions

  1. Problem
    - Existing communities, community memberships, offers, and shoutouts don't have trust scores
    - Users who performed these actions before trust score system was implemented miss out on points
    - This creates unfair experience for early adopters and community builders

  2. Solution
    - Backport trust scores for all historical data:
      * Community creation: +1000 points
      * Community joining: +50 points  
      * Resource offers: +50 points
      * Shoutout sending: +10 points
      * Shoutout receiving: +25 points
    - Use the centralized update_trust_score() function for consistency
    - Process in chronological order to maintain proper audit trail

  3. Benefits
    - Rewards all users fairly for their historical contributions
    - Maintains consistency in trust score calculations
    - Provides complete audit trail via trust_score_logs
    - Enables proper cache invalidation in frontend
*/

-- Backport trust scores for community creation
DO $$
DECLARE
    community_record RECORD;
BEGIN
    RAISE LOG 'Starting backport for community creation trust scores';
    
    FOR community_record IN 
        SELECT c.id, c.organizer_id, c.name, c.type, c.created_at
        FROM communities c
        WHERE NOT EXISTS (
            SELECT 1 FROM trust_score_logs tsl
            WHERE tsl.action_id = c.id 
            AND tsl.action_type = 'community_creation'
        )
        ORDER BY c.created_at ASC
    LOOP
        RAISE LOG 'Backporting community creation trust score for community % by user %', 
            community_record.id, community_record.organizer_id;
            
        PERFORM update_trust_score(
            community_record.organizer_id::TEXT,
            community_record.id::TEXT,
            'community_creation'::trust_score_action_type,
            community_record.id::TEXT,
            1000,
            jsonb_build_object(
                'community_name', community_record.name,
                'community_type', community_record.type,
                'backported', true,
                'original_created_at', community_record.created_at
            )
        );
    END LOOP;
    
    RAISE LOG 'Completed backport for community creation trust scores';
END
$$;

-- Backport trust scores for community joining
DO $$
DECLARE
    membership_record RECORD;
BEGIN
    RAISE LOG 'Starting backport for community joining trust scores';
    
    FOR membership_record IN 
        SELECT cm.community_id, cm.user_id, cm.created_at, c.name as community_name
        FROM community_memberships cm
        JOIN communities c ON c.id = cm.community_id
        WHERE NOT EXISTS (
            SELECT 1 FROM trust_score_logs tsl
            WHERE tsl.user_id = cm.user_id 
            AND tsl.community_id = cm.community_id
            AND tsl.action_type = 'community_join'
        )
        ORDER BY cm.created_at ASC
    LOOP
        RAISE LOG 'Backporting community join trust score for user % joining community %', 
            membership_record.user_id, membership_record.community_id;
            
        PERFORM update_trust_score(
            membership_record.user_id::TEXT,
            membership_record.community_id::TEXT,
            'community_join'::trust_score_action_type,
            membership_record.community_id::TEXT,
            50,
            jsonb_build_object(
                'community_name', membership_record.community_name,
                'backported', true,
                'original_created_at', membership_record.created_at
            )
        );
    END LOOP;
    
    RAISE LOG 'Completed backport for community joining trust scores';
END
$$;

-- Backport trust scores for resource offers
DO $$
DECLARE
    resource_record RECORD;
    community_record RECORD;
BEGIN
    RAISE LOG 'Starting backport for resource offer trust scores';
    
    FOR resource_record IN 
        SELECT r.id, r.owner_id, r.title, r.created_at
        FROM resources r
        WHERE r.type = 'offer'
        AND NOT EXISTS (
            SELECT 1 FROM trust_score_logs tsl
            WHERE tsl.action_id = r.id 
            AND tsl.action_type = 'resource_offer'
        )
        ORDER BY r.created_at ASC
    LOOP
        RAISE LOG 'Backporting resource offer trust score for resource % by user %', 
            resource_record.id, resource_record.owner_id;
        
        -- Award trust score in each community the resource belongs to
        FOR community_record IN 
            SELECT rc.community_id, c.name as community_name
            FROM resource_communities rc
            JOIN communities c ON c.id = rc.community_id
            WHERE rc.resource_id = resource_record.id
        LOOP
            PERFORM update_trust_score(
                resource_record.owner_id::TEXT,
                community_record.community_id::TEXT,
                'resource_offer'::trust_score_action_type,
                resource_record.id::TEXT,
                50,
                jsonb_build_object(
                    'resource_title', resource_record.title,
                    'community_name', community_record.community_name,
                    'backported', true,
                    'original_created_at', resource_record.created_at
                )
            );
        END LOOP;
    END LOOP;
    
    RAISE LOG 'Completed backport for resource offer trust scores';
END
$$;

-- Backport trust scores for shoutouts (both sent and received)
DO $$
DECLARE
    shoutout_record RECORD;
BEGIN
    RAISE LOG 'Starting backport for shoutout trust scores';
    
    FOR shoutout_record IN 
        SELECT s.id, s.sender_id, s.receiver_id, s.community_id, s.message, s.created_at
        FROM shoutouts s
        WHERE NOT EXISTS (
            SELECT 1 FROM trust_score_logs tsl
            WHERE tsl.action_id = s.id 
            AND tsl.action_type IN ('shoutout_sent', 'shoutout_received')
        )
        ORDER BY s.created_at ASC
    LOOP
        RAISE LOG 'Backporting shoutout trust scores for shoutout % (sender: %, receiver: %)', 
            shoutout_record.id, shoutout_record.sender_id, shoutout_record.receiver_id;
        
        -- Award points to sender for sending shoutout
        PERFORM update_trust_score(
            shoutout_record.sender_id::TEXT,
            shoutout_record.community_id::TEXT,
            'shoutout_sent'::trust_score_action_type,
            shoutout_record.id::TEXT,
            10,
            jsonb_build_object(
                'message', shoutout_record.message,
                'receiver_id', shoutout_record.receiver_id,
                'backported', true,
                'original_created_at', shoutout_record.created_at
            )
        );
        
        -- Award points to receiver for receiving shoutout
        PERFORM update_trust_score(
            shoutout_record.receiver_id::TEXT,
            shoutout_record.community_id::TEXT,
            'shoutout_received'::trust_score_action_type,
            shoutout_record.id::TEXT,
            25,
            jsonb_build_object(
                'message', shoutout_record.message,
                'sender_id', shoutout_record.sender_id,
                'backported', true,
                'original_created_at', shoutout_record.created_at
            )
        );
    END LOOP;
    
    RAISE LOG 'Completed backport for shoutout trust scores';
END
$$;

-- Verify the backport results
DO $$
DECLARE
    stats_record RECORD;
BEGIN
    RAISE LOG 'Trust score backport statistics:';
    
    FOR stats_record IN
        SELECT 
            action_type,
            COUNT(*) as count,
            SUM(points_change) as total_points
        FROM trust_score_logs
        WHERE metadata->>'backported' = 'true'
        GROUP BY action_type
        ORDER BY action_type
    LOOP
        RAISE LOG '  %: % actions, % total points awarded', 
            stats_record.action_type, stats_record.count, stats_record.total_points;
    END LOOP;
END
$$;

-- Add comment for documentation
COMMENT ON FUNCTION update_trust_score(TEXT, TEXT, trust_score_action_type, TEXT, INTEGER, JSONB) 
IS 'Centralized function for updating trust scores and logging all changes with proper error handling. Used for both real-time and backport operations.';