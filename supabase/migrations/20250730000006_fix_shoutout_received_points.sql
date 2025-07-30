/*
  # Fix Shoutout Received Points to 100

  1. Problem
    - Shoutout received was backported with 25 points but should be 100 points
    - Need to correct existing backported records and ensure future consistency

  2. Solution
    - Update existing trust_score_logs entries for shoutout_received actions
    - Recalculate and update trust_scores for affected users
    - Use proper audit trail to track the correction

  3. Benefits
    - Corrects the point value to the intended 100 points
    - Maintains audit trail of the correction
    - Ensures fair scoring for shoutout recipients
*/

-- First, identify and correct existing shoutout_received records
DO $$
DECLARE
    correction_record RECORD;
    current_score INTEGER;
    corrected_score INTEGER;
    points_difference INTEGER := 75; -- 100 - 25 = 75 additional points needed
BEGIN
    RAISE LOG 'Starting correction of shoutout_received points from 25 to 100';
    
    -- Find all backported shoutout_received entries that need correction
    FOR correction_record IN 
        SELECT 
            tsl.user_id,
            tsl.community_id,
            tsl.action_id,
            tsl.points_change,
            tsl.score_before,
            tsl.score_after,
            tsl.metadata
        FROM trust_score_logs tsl
        WHERE tsl.action_type = 'shoutout_received'
        AND tsl.metadata->>'backported' = 'true'
        AND tsl.points_change = 25
    LOOP
        RAISE LOG 'Correcting shoutout_received points for user % in community % (action %)', 
            correction_record.user_id, correction_record.community_id, correction_record.action_id;
        
        -- Get current trust score
        SELECT score INTO current_score
        FROM trust_scores
        WHERE user_id = correction_record.user_id 
        AND community_id = correction_record.community_id;
        
        -- Calculate corrected score (add the 75 point difference)
        corrected_score := current_score + points_difference;
        
        -- Update the trust_scores table
        UPDATE trust_scores 
        SET 
            score = corrected_score,
            last_calculated_at = now(),
            updated_at = now()
        WHERE user_id = correction_record.user_id 
        AND community_id = correction_record.community_id;
        
        -- Update the original log entry to reflect correct points
        UPDATE trust_score_logs
        SET 
            points_change = 100,
            score_after = correction_record.score_before + 100,
            metadata = correction_record.metadata || jsonb_build_object(
                'corrected_from_25_to_100', true,
                'corrected_at', now()
            )
        WHERE user_id = correction_record.user_id
        AND community_id = correction_record.community_id
        AND action_id = correction_record.action_id
        AND action_type = 'shoutout_received'
        AND metadata->>'backported' = 'true';
        
        -- Add a correction log entry for audit trail
        INSERT INTO trust_score_logs (
            user_id,
            community_id,
            action_type,
            action_id,
            points_change,
            score_before,
            score_after,
            metadata,
            created_at
        )
        VALUES (
            correction_record.user_id,
            correction_record.community_id,
            'shoutout_received',
            correction_record.action_id,
            points_difference,
            current_score,
            corrected_score,
            correction_record.metadata || jsonb_build_object(
                'correction', true,
                'reason', 'Adjusting shoutout_received from 25 to 100 points',
                'original_points', 25,
                'corrected_points', 100,
                'points_difference', points_difference
            ),
            now()
        );
        
        RAISE LOG 'Successfully corrected shoutout_received points: user % score updated from % to %', 
            correction_record.user_id, current_score, corrected_score;
    END LOOP;
    
    RAISE LOG 'Completed correction of shoutout_received points to 100';
END
$$;

-- Verify the correction results
DO $$
DECLARE
    stats_record RECORD;
BEGIN
    RAISE LOG 'SHOUTOUT POINTS CORRECTION VERIFICATION:';
    
    -- Check corrected shoutout_received entries
    FOR stats_record IN
        SELECT 
            action_type,
            COUNT(*) as count,
            SUM(points_change) as total_points,
            AVG(points_change) as avg_points
        FROM trust_score_logs
        WHERE action_type = 'shoutout_received'
        AND metadata->>'backported' = 'true'
        GROUP BY action_type
    LOOP
        RAISE LOG '  %: % actions, % total points (avg: % per action)', 
            stats_record.action_type, stats_record.count, stats_record.total_points, stats_record.avg_points;
    END LOOP;
    
    -- Check correction log entries
    SELECT COUNT(*) INTO stats_record.count
    FROM trust_score_logs
    WHERE metadata->>'correction' = 'true'
    AND metadata->>'reason' LIKE '%shoutout_received%';
    
    RAISE LOG 'Created % correction log entries for audit trail', stats_record.count;
    RAISE LOG 'Shoutout received points correction completed successfully!';
END
$$;