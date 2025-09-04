-- Fix trust score system by improving error handling and debugging
-- The current system silently fails, making it impossible to debug

-- Replace the update_trust_score function with better error handling
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
  -- Check if user and community exist first
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User % does not exist in profiles table', p_user_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM communities WHERE id = p_community_id) THEN
    RAISE EXCEPTION 'Community % does not exist in communities table', p_community_id;
  END IF;

  -- Get current score for this user in this community
  SELECT COALESCE(score, 0) INTO current_score
  FROM trust_scores 
  WHERE user_id = p_user_id AND community_id = p_community_id;

  -- Ensure current_score is never NULL
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

  -- Log the score change
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
    current_score,
    new_score,
    p_metadata,
    now()
  );

  -- Success - no exceptions means it worked
  
END;
$function$;

-- Recreate the trigger function to ensure it uses the new version
CREATE OR REPLACE FUNCTION trust_score_on_membership_insert()
RETURNS TRIGGER AS $$
DECLARE
  points_to_award INTEGER;
  action_type_to_use trust_score_action_type;
BEGIN
  -- Award different points based on role
  IF NEW.role = 'organizer' THEN
    points_to_award := 500;  -- Organizer joining (community creation flow)
    action_type_to_use := 'community_organizer_join'::trust_score_action_type;
  ELSE
    points_to_award := 50;   -- Regular member joining
    action_type_to_use := 'community_member_join'::trust_score_action_type;
  END IF;

  -- Call the updated function - any errors will now propagate
  PERFORM update_trust_score(
    NEW.user_id,
    NEW.community_id,
    action_type_to_use,
    NEW.community_id,
    points_to_award,
    jsonb_build_object(
      'trigger', 'community_membership_insert',
      'role', NEW.role
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix the notification function to use correct field names for trust_scores table
CREATE OR REPLACE FUNCTION notify_on_trust_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify on score changes that result in point increases
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.score > OLD.score) THEN
    PERFORM create_notification(
      NEW.user_id,
      'trust_points_received',
      NULL, -- No specific actor for system actions
      'Trust points received',
      format('You received trust points. Your score is now %s.', NEW.score),
      NULL, -- action_url
      NULL, -- resource_id
      NULL, -- comment_id
      NULL, -- claim_id
      NULL, -- message_id
      NULL, -- conversation_id
      NEW.community_id,
      jsonb_build_object('score', NEW.score, 'community_id', NEW.community_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix the trust level change notification function to use score instead of non-existent trust_level
CREATE OR REPLACE FUNCTION notify_on_trust_level_change()
RETURNS TRIGGER AS $$
BEGIN
  -- For now, disable this trigger since there's no trust_level field
  -- This function was expecting a trust_level field that doesn't exist
  -- We could implement level calculation based on score ranges if needed
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;