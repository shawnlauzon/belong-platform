/*
  # Fix UUID casting in update_trust_score function

  1. Problem
    - trust_scores table has UUID columns but update_trust_score accepts TEXT parameters
    - Comparisons like "WHERE user_id = p_user_id" fail with "operator does not exist: uuid = text"
    - This caused the backport migration to fail silently

  2. Solution
    - Update the update_trust_score function to properly cast TEXT parameters to UUID
    - Maintain backward compatibility by keeping TEXT parameters
    - Fix all places where UUID comparison is needed

  3. Benefits
    - Fixes the backport process
    - Maintains consistency with existing function signature
    - Proper type safety for UUID operations
*/

-- Fix the update_trust_score function to handle UUID casting properly
CREATE OR REPLACE FUNCTION update_trust_score(
  p_user_id TEXT,
  p_community_id TEXT,
  p_action_type trust_score_action_type,
  p_action_id TEXT,
  p_points_change INTEGER,
  p_metadata JSONB DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  current_score INTEGER := 0;
  new_score INTEGER;
BEGIN
  -- Log the attempt for debugging
  RAISE LOG 'Updating trust score for user % in community % for action %', 
    p_user_id, p_community_id, p_action_type;
  
  -- Get current trust score for this user in this community (if exists)
  -- Cast TEXT parameters to UUID for comparison
  SELECT score INTO current_score
  FROM trust_scores
  WHERE user_id = p_user_id::UUID AND community_id = p_community_id::UUID;
  
  -- If no existing score found, start with 0
  IF current_score IS NULL THEN
    current_score := 0;
  END IF;
  
  -- Calculate new score
  new_score := current_score + p_points_change;
  
  -- Ensure score doesn't go negative
  IF new_score < 0 THEN
    new_score := 0;
  END IF;
  
  -- Upsert the trust score with UUID casting
  INSERT INTO trust_scores (
    user_id,
    community_id,
    score,
    last_calculated_at,
    created_at,
    updated_at
  )
  VALUES (
    p_user_id::UUID,
    p_community_id::UUID,
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
  
  -- Log the trust score change with UUID casting for user_id and community_id
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
    p_user_id::UUID,
    p_community_id::UUID,
    p_action_type,
    p_action_id,
    p_points_change,
    current_score,
    new_score,
    p_metadata,
    now()
  );
  
  RAISE LOG 'Successfully updated trust score for user % in community % from % to %', 
    p_user_id, p_community_id, current_score, new_score;
  
EXCEPTION
  WHEN unique_violation THEN
    -- Handle duplicate key violations
    RAISE LOG 'Trust score update conflict for user % in community %', p_user_id, p_community_id;
    
  WHEN foreign_key_violation THEN
    -- Handle foreign key constraint violations
    RAISE WARNING 'Foreign key violation updating trust score for user % in community %: %', 
      p_user_id, p_community_id, SQLERRM;
    
  WHEN OTHERS THEN
    -- Handle any other errors
    RAISE WARNING 'Unexpected error updating trust score for user % in community %: %', 
      p_user_id, p_community_id, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update comment for documentation
COMMENT ON FUNCTION update_trust_score(TEXT, TEXT, trust_score_action_type, TEXT, INTEGER, JSONB) 
IS 'Centralized function for updating trust scores and logging all changes with proper error handling. Handles UUID casting internally while accepting TEXT parameters for compatibility.';