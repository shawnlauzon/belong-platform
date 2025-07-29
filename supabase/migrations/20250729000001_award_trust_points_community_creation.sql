/*
  # Award trust points for community creation

  1. Problem
    - Users who create communities don't automatically receive trust points
    - This creates inconsistent experience compared to other trust-earning actions
    - Integration tests and business logic expect 1000 points for community creators

  2. Solution
    - Create function to award 1000 trust points when community is created
    - Use upsert pattern to handle existing trust scores
    - Log the action in trust_score_logs for transparency
    - Follow established patterns from other trust score triggers

  3. Benefits
    - Rewards community creation with 1000 trust points
    - Maintains consistency with trust score system
    - Provides proper audit trail via logs
    - Enables cache invalidation in frontend code
*/

-- Create function to award trust points for community creation
CREATE OR REPLACE FUNCTION award_trust_points_for_community_creation()
RETURNS TRIGGER AS $$
DECLARE
  current_score INTEGER := 0;
  new_score INTEGER;
BEGIN
  -- Log the attempt for debugging
  RAISE LOG 'Awarding trust points for community creation by user % for community %', NEW.organizer_id, NEW.id;
  
  -- Get current trust score for this user in this community (if exists)
  SELECT score INTO current_score
  FROM trust_scores
  WHERE user_id = NEW.organizer_id AND community_id = NEW.id;
  
  -- If no existing score found, start with 0
  IF current_score IS NULL THEN
    current_score := 0;
  END IF;
  
  -- Calculate new score (add 1000 points for community creation)
  new_score := current_score + 1000;
  
  -- Upsert the trust score
  INSERT INTO trust_scores (
    user_id,
    community_id,
    score,
    last_calculated_at,
    created_at,
    updated_at
  )
  VALUES (
    NEW.organizer_id,
    NEW.id,
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
  
  -- Log the trust score change
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
    NEW.organizer_id,
    NEW.id,
    'community_creation',
    NEW.id,
    1000,
    current_score,
    new_score,
    jsonb_build_object(
      'community_name', NEW.name,
      'community_type', NEW.type
    ),
    now()
  );
  
  RAISE LOG 'Successfully awarded 1000 trust points to user % for creating community %', NEW.organizer_id, NEW.id;
  RETURN NEW;
  
EXCEPTION
  WHEN unique_violation THEN
    -- Handle duplicate key violations
    RAISE LOG 'Trust score already exists for user % in community %', NEW.organizer_id, NEW.id;
    RETURN NEW;
    
  WHEN foreign_key_violation THEN
    -- Handle foreign key constraint violations
    RAISE WARNING 'Foreign key violation awarding trust points to user % for community %: %', NEW.organizer_id, NEW.id, SQLERRM;
    RETURN NEW;
    
  WHEN OTHERS THEN
    -- Handle any other errors
    RAISE WARNING 'Unexpected error awarding trust points to user % for community %: %', NEW.organizer_id, NEW.id, SQLERRM;
    -- Still return NEW to allow community creation to proceed
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to award trust points for community creation
DROP TRIGGER IF EXISTS award_trust_points_community_creation_trigger ON communities;
CREATE TRIGGER award_trust_points_community_creation_trigger
  AFTER INSERT ON communities
  FOR EACH ROW
  EXECUTE FUNCTION award_trust_points_for_community_creation();

-- Add a comment for documentation
COMMENT ON FUNCTION award_trust_points_for_community_creation() IS 'Automatically awards 1000 trust points to community organizer when a new community is created. Includes comprehensive error handling and audit logging.';