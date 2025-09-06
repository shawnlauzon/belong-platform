-- Add reason field to trust points notification metadata
-- This enhancement modifies update_trust_score to create notifications directly with the known action_type

-- Remove the old trust points notification trigger since we'll handle notifications in update_trust_score
DROP TRIGGER IF EXISTS trust_points_notification_trigger ON trust_scores;

-- Update update_trust_score function to create trust points notifications directly with reason
CREATE OR REPLACE FUNCTION update_trust_score(
  p_user_id UUID, 
  p_community_id UUID, 
  p_action_type trust_score_action_type, 
  p_action_id UUID, 
  p_points_change INTEGER, 
  p_metadata JSONB DEFAULT '{}'::JSONB
) 
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE
  current_score INTEGER := 0;
  new_score INTEGER;
  old_score INTEGER;
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

  -- Log the trust score change
  INSERT INTO trust_score_logs (
    user_id, community_id, action_type, action_id, 
    points_change, score_before, score_after, metadata, created_at
  ) VALUES (
    p_user_id, p_community_id, p_action_type, p_action_id,
    p_points_change, old_score, new_score, p_metadata, NOW()
  );

  -- Create notification directly with known action_type (only for positive changes)
  IF p_points_change > 0 THEN
    PERFORM create_notification_base(
      p_user_id := p_user_id,
      p_type := 'trust_points_changed',
      p_community_id := p_community_id,
      p_metadata := jsonb_build_object(
        'amount', p_points_change,
        'old_score', old_score,
        'new_score', new_score,
        'reason', p_action_type::text
      )
    );
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in update_trust_score for user % community %: %', 
      p_user_id, p_community_id, SQLERRM;
END;
$function$;