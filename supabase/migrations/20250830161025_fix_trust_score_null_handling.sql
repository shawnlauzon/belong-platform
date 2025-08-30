-- Fix NULL handling in trust score system
-- This migration fixes the critical bug where trust score triggers fail silently
-- when trying to insert NULL values into trust_score_logs

-- Fix the core update_trust_score function to properly handle NULL current_score
CREATE OR REPLACE FUNCTION public.update_trust_score(
  p_user_id uuid, 
  p_community_id uuid, 
  p_action_type trust_score_action_type, 
  p_action_id uuid, 
  p_points_change integer, 
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  current_score INTEGER := 0;
  new_score INTEGER;
BEGIN
  -- Log the attempt for debugging
  RAISE LOG 'Updating trust score for user % in community % for action %', 
    p_user_id, p_community_id, p_action_type;

  -- Get current score for this user in this community
  SELECT COALESCE(score, 0) INTO current_score
  FROM trust_scores 
  WHERE user_id = p_user_id AND community_id = p_community_id;

  -- CRITICAL FIX: Ensure current_score is never NULL
  -- When no record exists, the SELECT above returns no rows, leaving current_score as NULL
  -- This caused NOT NULL constraint violations in trust_score_logs
  current_score := COALESCE(current_score, 0);

  -- Calculate new score
  new_score := current_score + p_points_change;
  
  -- Ensure new score doesn't go below 0
  new_score := GREATEST(new_score, 0);

  -- Insert or update the trust score
  INSERT INTO trust_scores (
    user_id,
    community_id,
    score,
    last_calculated_at,
    created_at,
    updated_at
  )
  VALUES (
    p_user_id,
    p_community_id,
    new_score,
    now(),
    now(),
    now()
  )
  ON CONFLICT (user_id, community_id) 
  DO UPDATE SET
    score = new_score,
    last_calculated_at = now(),
    updated_at = now();

  -- Log the score change (now safe from NULL constraint violations)
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
    p_user_id,
    p_community_id,
    p_action_type,
    p_action_id,
    p_points_change,
    current_score,  -- Now guaranteed to be 0, not NULL
    new_score,
    p_metadata,
    now()
  );

  RAISE LOG 'Updated trust score for user % in community % from % to % (+%)', 
    p_user_id, p_community_id, current_score, new_score, p_points_change;

EXCEPTION
  WHEN foreign_key_violation THEN
    -- Handle foreign key constraint violations gracefully
    RAISE WARNING 'Foreign key violation updating trust score for user % in community %: %', 
      p_user_id, p_community_id, SQLERRM;
      
  WHEN OTHERS THEN
    -- Handle any other errors
    RAISE WARNING 'Unexpected error updating trust score for user % in community %: %', 
      p_user_id, p_community_id, SQLERRM;
END;
$function$;