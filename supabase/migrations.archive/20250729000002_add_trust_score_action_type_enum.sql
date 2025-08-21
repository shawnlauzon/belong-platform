/*
  # Add trust score action type enum

  1. Problem
    - action_type in trust_score_logs is currently just a string without constraints
    - This allows inconsistent values and typos
    - No clear documentation of what action types are valid
    - Makes it difficult to ensure all trust-earning actions are properly tracked

  2. Solution
    - Create an enum type for trust_score_action_type with all known action types
    - Update trust_score_logs table to use this enum
    - Update update_trust_score function to use this enum
    - Provide clear documentation of all trust-earning actions

  3. Benefits
    - Ensures data consistency and prevents typos
    - Documents all possible trust-earning actions
    - Provides type safety for trust score logging
    - Makes it easier to add new action types in the future
*/

-- Create enum for trust score action types
-- Based on existing business logic in hooks and expected trust-earning actions
CREATE TYPE trust_score_action_type AS ENUM (
  'community_creation',      -- Creating a new community (+1000 points)
  'community_join',          -- Joining a community (+50 points, mentioned in useJoinCommunity)
  'resource_offer',          -- Creating an offer resource (+50 points, mentioned in useCreateResource)
  'resource_claim',          -- Claiming a resource from another user
  'resource_completion',     -- Completing a resource exchange
  'shoutout_sent',           -- Sending a shoutout to another user
  'shoutout_received'        -- Receiving a shoutout from another user
);

-- Update trust_score_logs table to use the enum
ALTER TABLE trust_score_logs 
ALTER COLUMN action_type TYPE trust_score_action_type 
USING action_type::trust_score_action_type;

-- Update the update_trust_score function to use the enum
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
  SELECT score INTO current_score
  FROM trust_scores
  WHERE user_id = p_user_id AND community_id = p_community_id;
  
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

-- Update the community creation trigger to use the new function
CREATE OR REPLACE FUNCTION award_trust_points_for_community_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Use the centralized trust score update function
  PERFORM update_trust_score(
    NEW.organizer_id,
    NEW.id,
    'community_creation'::trust_score_action_type,
    NEW.id,
    1000,
    jsonb_build_object(
      'community_name', NEW.name,
      'community_type', NEW.type
    )
  );
  
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Handle any errors but don't fail community creation
    RAISE WARNING 'Error awarding trust points for community creation by user % for community %: %', 
      NEW.organizer_id, NEW.id, SQLERRM;
    return NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TYPE trust_score_action_type IS 'Enum defining all possible actions that can affect trust scores in the platform';
COMMENT ON FUNCTION update_trust_score(TEXT, TEXT, trust_score_action_type, TEXT, INTEGER, JSONB) IS 'Centralized function for updating trust scores and logging all changes with proper error handling';