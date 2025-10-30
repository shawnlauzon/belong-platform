-- Fix trustlevel.changed notification to only trigger on actual level changes
-- Previously: notification sent whenever points increased
-- Now: notification only sent when level index changes

CREATE OR REPLACE FUNCTION update_trust_score(
  p_user_id uuid,
  p_community_id uuid,
  p_action_type action_type,
  p_action_id uuid,
  p_points_change integer,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_score INTEGER := 0;
  new_score INTEGER;
  old_score INTEGER;
  old_level INTEGER;
  new_level INTEGER;
BEGIN
  -- Get current score for this user in this community
  SELECT score INTO current_score
  FROM trust_scores
  WHERE user_id = p_user_id AND community_id = p_community_id;

  old_score := COALESCE(current_score, 0);
  new_score := old_score + p_points_change;

  -- Calculate levels before and after score change
  old_level := calculate_trust_level(old_score);
  new_level := calculate_trust_level(new_score);

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

  -- Create notification only when level actually changes
  -- This ensures users are notified of level ups, not every point gain
  IF old_level != new_level THEN
    PERFORM create_notification_base(
      p_user_id := p_user_id,
      p_action := 'trustlevel.changed'::action_type,
      p_community_id := p_community_id,
      p_metadata := jsonb_build_object(
        'amount', p_points_change,
        'old_level', old_level,
        'new_level', new_level,
        'reason', p_action_type::text
      )
    );
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in update_trust_score for user % community %: %',
      p_user_id, p_community_id, SQLERRM;
END;
$$;
