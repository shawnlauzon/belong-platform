-- Consolidate update_trust_score to single consistent function signature
-- This fixes the missing function signature error and consolidates all variations

-- Drop the existing overloaded functions to avoid conflicts
DROP FUNCTION IF EXISTS "public"."update_trust_score"("p_user_id" "text", "p_community_id" "text", "p_action_type" "public"."trust_score_action_type", "p_action_id" "text", "p_points_change" integer, "p_metadata" "jsonb");
DROP FUNCTION IF EXISTS "public"."update_trust_score"("p_user_id" "uuid", "p_community_id" "uuid", "p_action_type" "text", "p_action_id" "uuid", "p_points_change" integer, "p_metadata" "jsonb");

-- Create single consolidated function with proper signature
-- Uses UUID parameters and trust_score_action_type enum
CREATE OR REPLACE FUNCTION "public"."update_trust_score"(
  "p_user_id" "uuid", 
  "p_community_id" "uuid", 
  "p_action_type" "public"."trust_score_action_type", 
  "p_action_id" "uuid", 
  "p_points_change" integer, 
  "p_metadata" "jsonb" DEFAULT '{}'::"jsonb"
) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;

-- Fix baseline functions to use correct enum values with the new function signature
CREATE OR REPLACE FUNCTION "public"."trust_score_on_membership_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  PERFORM update_trust_score(
    NEW.user_id,
    NEW.community_id,
    'community_join'::trust_score_action_type,
    NEW.community_id,
    50,
    jsonb_build_object('trigger', 'community_membership_insert')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."trust_score_on_resource_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_community_id UUID;
BEGIN
  -- Only process offers
  IF NEW.type != 'offer' THEN
    RETURN NEW;
  END IF;

  -- Award points for each community the resource is associated with
  FOR v_community_id IN
    SELECT community_id 
    FROM resource_communities 
    WHERE resource_id = NEW.id
  LOOP
    PERFORM update_trust_score(
      NEW.owner_id,
      v_community_id,
      'resource_offer'::trust_score_action_type,
      NEW.id,
      50,
      jsonb_build_object(
        'trigger', 'resource_insert',
        'resource_type', NEW.type,
        'resource_title', NEW.title
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."trust_score_on_shoutout_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Award points to receiver
  PERFORM update_trust_score(
    NEW.receiver_id,
    NEW.community_id,
    'shoutout_received'::trust_score_action_type,
    NEW.id,
    100,
    jsonb_build_object(
      'trigger', 'shoutout_insert',
      'role', 'receiver',
      'sender_id', NEW.sender_id
    )
  );

  -- Award points to sender  
  PERFORM update_trust_score(
    NEW.sender_id,
    NEW.community_id,
    'shoutout_sent'::trust_score_action_type,
    NEW.id,
    10,
    jsonb_build_object(
      'trigger', 'shoutout_insert',
      'role', 'sender',
      'receiver_id', NEW.receiver_id
    )
  );

  RETURN NEW;
END;
$$;

-- Add function permissions
ALTER FUNCTION "public"."update_trust_score"("p_user_id" "uuid", "p_community_id" "uuid", "p_action_type" "public"."trust_score_action_type", "p_action_id" "uuid", "p_points_change" integer, "p_metadata" "jsonb") OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."update_trust_score"("p_user_id" "uuid", "p_community_id" "uuid", "p_action_type" "public"."trust_score_action_type", "p_action_id" "uuid", "p_points_change" integer, "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_trust_score"("p_user_id" "uuid", "p_community_id" "uuid", "p_action_type" "public"."trust_score_action_type", "p_action_id" "uuid", "p_points_change" integer, "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_trust_score"("p_user_id" "uuid", "p_community_id" "uuid", "p_action_type" "public"."trust_score_action_type", "p_action_id" "uuid", "p_points_change" integer, "p_metadata" "jsonb") TO "service_role";

COMMENT ON FUNCTION "public"."update_trust_score"("p_user_id" "uuid", "p_community_id" "uuid", "p_action_type" "public"."trust_score_action_type", "p_action_id" "uuid", "p_points_change" integer, "p_metadata" "jsonb") IS 'Single consolidated function for updating trust scores. Uses UUID parameters and trust_score_action_type enum. Handles all trust score updates with proper error handling and logging.';