

-- Enable PostGIS extension for geometry types
CREATE EXTENSION IF NOT EXISTS "postgis";

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."resource_category" AS ENUM (
    'tools',
    'skills',
    'food',
    'supplies',
    'other',
    'rides',
    'housing',
    'drinks'
);


ALTER TYPE "public"."resource_category" OWNER TO "postgres";


CREATE TYPE "public"."resource_claim_limit_per" AS ENUM (
    'total',
    'timeslot'
);


ALTER TYPE "public"."resource_claim_limit_per" OWNER TO "postgres";


CREATE TYPE "public"."resource_claim_status" AS ENUM (
    'pending',
    'approved',
    'rejected',
    'completed',
    'cancelled',
    'interested',
    'given',
    'received',
    'flaked'
);


ALTER TYPE "public"."resource_claim_status" OWNER TO "postgres";


CREATE TYPE "public"."resource_status" AS ENUM (
    'open',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."resource_status" OWNER TO "postgres";


CREATE TYPE "public"."resource_timeslot_status" AS ENUM (
    'active',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."resource_timeslot_status" OWNER TO "postgres";


CREATE TYPE "public"."resource_type" AS ENUM (
    'offer',
    'request',
    'event'
);


ALTER TYPE "public"."resource_type" OWNER TO "postgres";


CREATE TYPE "public"."trust_score_action_type" AS ENUM (
    'community_creation',
    'community_join',
    'resource_offer',
    'resource_claim',
    'resource_completion',
    'shoutout_sent',
    'shoutout_received'
);


ALTER TYPE "public"."trust_score_action_type" OWNER TO "postgres";


COMMENT ON TYPE "public"."trust_score_action_type" IS 'Enum defining all possible actions that can affect trust scores in the platform';



CREATE OR REPLACE FUNCTION "public"."auto_add_organizer_attendance"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Insert organizer as attendee with 'attending' status
    INSERT INTO gathering_responses (gathering_id, user_id, status)
    VALUES (NEW.id, NEW.organizer_id, 'attending')
    ON CONFLICT (gathering_id, user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_add_organizer_attendance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_add_organizer_to_community_memberships"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Log the attempt for debugging
  RAISE LOG 'Auto-adding organizer % to community % memberships', NEW.organizer_id, NEW.id;
  
  -- Insert the organizer as a member
  -- Note: member_count is updated automatically by community_memberships_insert_trigger
  INSERT INTO community_memberships (
    user_id,
    community_id,
    created_at,
    updated_at
  )
  VALUES (
    NEW.organizer_id,
    NEW.id,
    now(),
    now()
  )
  ON CONFLICT (user_id, community_id) DO NOTHING;
  
  RAISE LOG 'Successfully added organizer % to community % memberships', NEW.organizer_id, NEW.id;
  RETURN NEW;
  
EXCEPTION
  WHEN unique_violation THEN
    -- Handle duplicate key violations (shouldn't happen with ON CONFLICT, but just in case)
    RAISE LOG 'Organizer % already member of community %', NEW.organizer_id, NEW.id;
    RETURN NEW;
    
  WHEN foreign_key_violation THEN
    -- Handle foreign key constraint violations
    RAISE WARNING 'Foreign key violation adding organizer % to community %: %', NEW.organizer_id, NEW.id, SQLERRM;
    RETURN NEW;
    
  WHEN OTHERS THEN
    -- Handle any other errors
    RAISE WARNING 'Unexpected error adding organizer % to community %: %', NEW.organizer_id, NEW.id, SQLERRM;
    -- Still return NEW to allow community creation to proceed
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_add_organizer_to_community_memberships"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."auto_add_organizer_to_community_memberships"() IS 'Automatically adds community organizer to community_memberships table when a new community is created. Member count is updated automatically by community_memberships_insert_trigger. Includes comprehensive error handling to prevent community creation failures.';



CREATE OR REPLACE FUNCTION "public"."auto_add_organizer_to_event_attendances"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Log the attempt for debugging
  RAISE LOG 'Auto-adding organizer % to event % attendances', NEW.organizer_id, NEW.id;
  
  -- Insert the organizer as an attendee with "attending" status
  INSERT INTO event_attendances (
    user_id,
    event_id,
    status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.organizer_id,
    NEW.id,
    'attending',
    now(),
    now()
  )
  ON CONFLICT (user_id, event_id) DO NOTHING;
  
  -- DO NOT manually update attendee_count - let the existing trigger handle it
  
  RAISE LOG 'Successfully added organizer % to event % attendances', NEW.organizer_id, NEW.id;
  RETURN NEW;
  
EXCEPTION
  WHEN unique_violation THEN
    -- Handle duplicate key violations (shouldn't happen with ON CONFLICT, but just in case)
    RAISE LOG 'Organizer % already attending event %', NEW.organizer_id, NEW.id;
    RETURN NEW;
    
  WHEN foreign_key_violation THEN
    -- Handle foreign key constraint violations
    RAISE WARNING 'Foreign key violation adding organizer % to event %: %', NEW.organizer_id, NEW.id, SQLERRM;
    RETURN NEW;
    
  WHEN OTHERS THEN
    -- Handle any other errors
    RAISE WARNING 'Unexpected error adding organizer % to event %: %', NEW.organizer_id, NEW.id, SQLERRM;
    -- Still return NEW to allow event creation to proceed
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_add_organizer_to_event_attendances"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."auto_add_organizer_to_event_attendances"() IS 'Automatically adds event organizer to event_attendances table when a new event is created. Includes comprehensive error handling to prevent event creation failures.';



CREATE OR REPLACE FUNCTION "public"."auto_create_timeslot_claim"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  requires_approval boolean;
  resource_owner_id uuid;
  current_user_id uuid;
  claim_status resource_claim_status;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  
  -- Validate we have an authenticated user
  IF current_user_id IS NULL THEN
    RAISE WARNING 'TRIGGER: No authenticated user found when creating timeslot %', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Get resource details
  SELECT r.requires_approval, r.owner_id 
  INTO requires_approval, resource_owner_id
  FROM resources r
  WHERE r.id = NEW.resource_id;
  
  -- Validate resource exists
  IF NOT FOUND THEN
    RAISE WARNING 'TRIGGER: Resource % not found when creating timeslot %', NEW.resource_id, NEW.id;
    RETURN NEW;
  END IF;
  
  -- Determine status based on approval requirement and ownership
  claim_status := CASE 
    WHEN NOT requires_approval OR current_user_id = resource_owner_id 
    THEN 'approved'::resource_claim_status
    ELSE 'pending'::resource_claim_status
  END;
  
  -- Create the claim - omit claimant_id to use default auth.uid()
  INSERT INTO resource_claims (
    timeslot_id,
    resource_id,
    status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.resource_id,
    claim_status,
    now(),
    now()
  );
  
  RAISE LOG 'TRIGGER: Successfully created claim for timeslot % with status %', NEW.id, claim_status;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_create_timeslot_claim"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."auto_create_timeslot_claim"() IS 'Automatically creates a claim when a timeslot is created. Sets status to approved if no approval required or user is resource owner, otherwise pending.';



CREATE OR REPLACE FUNCTION "public"."award_trust_points_for_community_creation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."award_trust_points_for_community_creation"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."award_trust_points_for_community_creation"() IS 'Automatically awards 1000 trust points to community organizer when a new community is created. Includes comprehensive error handling and audit logging.';



CREATE OR REPLACE FUNCTION "public"."calculate_community_area"("community_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  community_area numeric;
BEGIN
  SELECT ST_Area(ST_Buffer(center::geography, radius_km * 1000)) / 1000000 
  INTO community_area
  FROM communities 
  WHERE id = community_id;
  
  RETURN community_area;
END;
$$;


ALTER FUNCTION "public"."calculate_community_area"("community_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_event_cancellation_penalty"("p_timeslot_id" "uuid", "p_cancelled_at" timestamp with time zone DEFAULT "now"()) RETURNS integer
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  v_event_start TIMESTAMP WITH TIME ZONE;
  v_hours_before NUMERIC;
BEGIN
  -- Get the event start time
  SELECT start_time INTO v_event_start
  FROM resource_timeslots
  WHERE id = p_timeslot_id;

  IF v_event_start IS NULL THEN
    RETURN 0; -- No penalty if timeslot not found
  END IF;

  -- Calculate hours before event
  v_hours_before := EXTRACT(EPOCH FROM (v_event_start - p_cancelled_at)) / 3600;

  -- Return penalty based on timing
  IF v_hours_before > 24 THEN
    RETURN -5;  -- More than 24 hours before
  ELSIF v_hours_before >= 6 THEN
    RETURN -10; -- Between 6-24 hours before
  ELSIF v_hours_before >= 1 THEN
    RETURN -10; -- Between 1-6 hours before (same as 6-24h)
  ELSE
    RETURN -20; -- Less than 1 hour before
  END IF;
END;
$$;


ALTER FUNCTION "public"."calculate_event_cancellation_penalty"("p_timeslot_id" "uuid", "p_cancelled_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."communities_containing_point"("lat" numeric, "lng" numeric) RETURNS TABLE("id" "uuid", "name" "text", "level_name" "text", "depth" integer, "member_count" integer, "area_km2" numeric, "distance_km" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE community_hierarchy AS (
    -- Base case: communities that contain the point
    SELECT 
      c.id,
      c.name,
      c.level as level_name,
      0 as depth,
      c.member_count,
      CASE 
        -- Isochrone boundary
        WHEN c.boundary_geometry IS NOT NULL THEN 
          ST_Area(c.boundary_geometry::geography) / 1000000.0
        -- Circular boundary (new format)
        WHEN c.boundary IS NOT NULL AND c.boundary->>'type' = 'circular' THEN
          PI() * POWER((c.boundary->>'radius_km')::numeric, 2)
        -- Legacy circular boundary
        WHEN c.radius_km IS NOT NULL THEN
          PI() * POWER(c.radius_km, 2)
        ELSE 0
      END as area_km2,
      CASE 
        -- Isochrone boundary - distance to centroid
        WHEN c.boundary_geometry IS NOT NULL THEN 
          ST_Distance(ST_Centroid(c.boundary_geometry)::geography, ST_Point(lng, lat)::geography) / 1000.0
        -- Circular boundary (new format)
        WHEN c.boundary IS NOT NULL AND c.boundary->>'type' = 'circular' THEN
          ST_Distance(
            ST_Point((c.boundary->'center'->0)::numeric, (c.boundary->'center'->1)::numeric)::geography,
            ST_Point(lng, lat)::geography
          ) / 1000.0
        -- Legacy circular boundary
        WHEN c.center IS NOT NULL THEN
          ST_Distance(c.center::geography, ST_Point(lng, lat)::geography) / 1000.0
        ELSE 0
      END as distance_km,
      c.parent_id
    FROM communities c
    WHERE c.deleted_at IS NULL
      AND (
        -- Point is within isochrone boundary
        (c.boundary_geometry IS NOT NULL AND ST_Contains(c.boundary_geometry, ST_Point(lng, lat))) OR
        -- Point is within circular boundary (new format)
        (c.boundary IS NOT NULL AND c.boundary->>'type' = 'circular' AND 
         ST_DWithin(
           ST_Point((c.boundary->'center'->0)::numeric, (c.boundary->'center'->1)::numeric)::geography,
           ST_Point(lng, lat)::geography,
           (c.boundary->>'radius_km')::numeric * 1000
         )) OR
        -- Point is within legacy circular boundary
        (c.boundary IS NULL AND c.center IS NOT NULL AND c.radius_km IS NOT NULL AND
         ST_DWithin(c.center::geography, ST_Point(lng, lat)::geography, c.radius_km * 1000))
      )
    
    UNION ALL
    
    -- Recursive case: parent communities
    SELECT 
      p.id,
      p.name,
      p.level as level_name,
      ch.depth + 1,
      p.member_count,
      CASE 
        -- Isochrone boundary
        WHEN p.boundary_geometry IS NOT NULL THEN 
          ST_Area(p.boundary_geometry::geography) / 1000000.0
        -- Circular boundary (new format)
        WHEN p.boundary IS NOT NULL AND p.boundary->>'type' = 'circular' THEN
          PI() * POWER((p.boundary->>'radius_km')::numeric, 2)
        -- Legacy circular boundary
        WHEN p.radius_km IS NOT NULL THEN
          PI() * POWER(p.radius_km, 2)
        ELSE 0
      END as area_km2,
      CASE 
        -- Isochrone boundary - distance to centroid
        WHEN p.boundary_geometry IS NOT NULL THEN 
          ST_Distance(ST_Centroid(p.boundary_geometry)::geography, ST_Point(lng, lat)::geography) / 1000.0
        -- Circular boundary (new format)
        WHEN p.boundary IS NOT NULL AND p.boundary->>'type' = 'circular' THEN
          ST_Distance(
            ST_Point((p.boundary->'center'->0)::numeric, (p.boundary->'center'->1)::numeric)::geography,
            ST_Point(lng, lat)::geography
          ) / 1000.0
        -- Legacy circular boundary
        WHEN p.center IS NOT NULL THEN
          ST_Distance(p.center::geography, ST_Point(lng, lat)::geography) / 1000.0
        ELSE 0
      END as distance_km,
      p.parent_id
    FROM communities p
    INNER JOIN community_hierarchy ch ON p.id = ch.parent_id
    WHERE p.deleted_at IS NULL
  )
  SELECT ch.id, ch.name, ch.level_name, ch.depth, ch.member_count, ch.area_km2, ch.distance_km
  FROM community_hierarchy ch
  ORDER BY ch.depth, ch.area_km2 ASC;
END;
$$;


ALTER FUNCTION "public"."communities_containing_point"("lat" numeric, "lng" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."estimate_population"("lat" numeric, "lng" numeric, "radius_km" numeric) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Placeholder: simple density estimate
  -- In real implementation, integrate with census/population data APIs
  RETURN ROUND((PI() * POWER(radius_km, 2)) * 100)::integer; -- ~100 people per km²
END;
$$;


ALTER FUNCTION "public"."estimate_population"("lat" numeric, "lng" numeric, "radius_km" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_boundary_polygon"("community_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT 
    CASE 
      WHEN boundary->>'type' = 'isochrone' THEN boundary->'polygon'
      WHEN boundary->>'type' = 'circular' THEN 
        ST_AsGeoJSON(
          ST_Buffer(
            ST_Point((boundary->'center'->0)::numeric, (boundary->'center'->1)::numeric)::geography,
            (boundary->>'radius_km')::numeric * 1000
          )::geometry
        )::jsonb
      WHEN boundary IS NULL AND center IS NOT NULL AND radius_km IS NOT NULL THEN
        ST_AsGeoJSON(ST_Buffer(center::geography, radius_km * 1000)::geometry)::jsonb
      ELSE NULL
    END
  INTO result
  FROM communities 
  WHERE id = community_id;
  
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_boundary_polygon"("community_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  user_email text;
  user_meta jsonb;
BEGIN
  -- Get the email, handling potential null values
  user_email := COALESCE(NEW.email, '');
  
  -- Ensure user_metadata is never null
  user_meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  
  -- Log the attempt for debugging
  RAISE LOG 'Creating profile for user: % with email: % and metadata: %', NEW.id, user_email, user_meta;
  
  -- Insert the profile with error handling
  INSERT INTO public.profiles (
    id, 
    email, 
    user_metadata,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id, 
    user_email,
    user_meta,
    COALESCE(NEW.created_at, now()),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    user_metadata = EXCLUDED.user_metadata,
    updated_at = now();
  
  RAISE LOG 'Successfully created profile for user: %', NEW.id;
  RETURN NEW;
  
EXCEPTION
  WHEN unique_violation THEN
    -- Handle duplicate key violations (shouldn't happen with ON CONFLICT, but just in case)
    RAISE LOG 'Profile already exists for user: %', NEW.id;
    RETURN NEW;
    
  WHEN foreign_key_violation THEN
    -- Handle foreign key constraint violations
    RAISE WARNING 'Foreign key violation creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
    
  WHEN check_violation THEN
    -- Handle check constraint violations
    RAISE WARNING 'Check constraint violation creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
    
  WHEN not_null_violation THEN
    -- Handle not null constraint violations
    RAISE WARNING 'Not null violation creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
    
  WHEN OTHERS THEN
    -- Handle any other errors
    RAISE WARNING 'Unexpected error creating profile for user %: %', NEW.id, SQLERRM;
    -- Still return NEW to allow user creation to proceed
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_community_member_of_resource"("resource_uuid" "uuid", "user_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM resource_communities rc
    JOIN community_memberships cm ON rc.community_id = cm.community_id
    WHERE rc.resource_id = resource_uuid 
    AND cm.user_id = user_uuid
  );
END;
$$;


ALTER FUNCTION "public"."is_community_member_of_resource"("resource_uuid" "uuid", "user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_resource_owner"("resource_uuid" "uuid", "user_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM resources 
    WHERE id = resource_uuid 
    AND owner_id = user_uuid
  );
END;
$$;


ALTER FUNCTION "public"."is_resource_owner"("resource_uuid" "uuid", "user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_new_message"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    sender_name TEXT;
    receiver_id UUID;
BEGIN
    -- Get sender's display name
    SELECT display_name INTO sender_name
    FROM public.profiles
    WHERE id = NEW.sender_id;

    -- Find the other participant in the conversation (receiver)
    SELECT user_id INTO receiver_id
    FROM public.conversation_participants
    WHERE conversation_id = NEW.conversation_id
      AND user_id != NEW.sender_id
    LIMIT 1;

    -- Create notification for the receiver
    IF receiver_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            content,
            data
        ) VALUES (
            receiver_id,
            'message',
            'New message from ' || COALESCE(sender_name, 'Someone'),
            CASE 
                WHEN LENGTH(NEW.content) > 50 
                THEN LEFT(NEW.content, 50) || '...'
                ELSE NEW.content
            END,
            jsonb_build_object(
                'conversation_id', NEW.conversation_id,
                'message_id', NEW.id,
                'sender_id', NEW.sender_id
            )
        );
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_new_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."store_circular_boundary"("community_id" "uuid", "boundary_data" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Validate input
  IF boundary_data->>'type' != 'circular' THEN
    RAISE EXCEPTION 'Function only supports circular boundaries';
  END IF;

  -- Update community with boundary data (no geometry columns for circular)
  UPDATE communities SET
    boundary = boundary_data,
    boundary_geometry = NULL,
    boundary_geometry_detailed = NULL
  WHERE id = community_id;
  
  -- Verify update succeeded
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Community with id % not found', community_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."store_circular_boundary"("community_id" "uuid", "boundary_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."store_isochrone_boundary"("community_id" "uuid", "boundary_data" "jsonb", "original_polygon" "public"."geometry") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Validate input
  IF boundary_data->>'type' != 'isochrone' THEN
    RAISE EXCEPTION 'Function only supports isochrone boundaries';
  END IF;
  
  IF original_polygon IS NULL THEN
    RAISE EXCEPTION 'Original polygon cannot be null for isochrone boundary';
  END IF;

  -- Update community with boundary data and geometries
  UPDATE communities SET
    boundary = boundary_data,
    boundary_geometry_detailed = original_polygon,
    boundary_geometry = ST_SimplifyPreserveTopology(original_polygon, 0.0001) -- ~10m tolerance
  WHERE id = community_id;
  
  -- Verify update succeeded
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Community with id % not found', community_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."store_isochrone_boundary"("community_id" "uuid", "boundary_data" "jsonb", "original_polygon" "public"."geometry") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trust_score_on_claim_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_resource RECORD;
  v_community_id UUID;
BEGIN
  -- Only process if status is 'pending' (for events)
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Get resource details
  SELECT r.type, r.owner_id, r.title 
  INTO v_resource
  FROM resources r
  WHERE r.id = NEW.resource_id;

  -- Only process events
  IF v_resource.type != 'event' THEN
    RETURN NEW;
  END IF;

  -- Award points for each community
  FOR v_community_id IN
    SELECT community_id 
    FROM resource_communities 
    WHERE resource_id = NEW.resource_id
  LOOP
    PERFORM update_trust_score(
      NEW.claimant_id,
      v_community_id,
      'rsvp_event',
      NEW.id,
      5,
      jsonb_build_object(
        'trigger', 'resource_claim_insert',
        'resource_type', v_resource.type,
        'resource_title', v_resource.title,
        'status', NEW.status
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trust_score_on_claim_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trust_score_on_claim_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_resource RECORD;
  v_community_id UUID;
  v_points INTEGER;
  v_action_type TEXT;
  v_metadata JSONB;
BEGIN
  -- Get resource details
  SELECT r.type, r.owner_id, r.title 
  INTO v_resource
  FROM resources r
  WHERE r.id = NEW.resource_id;

  -- Get communities for this resource
  FOR v_community_id IN
    SELECT community_id 
    FROM resource_communities 
    WHERE resource_id = NEW.resource_id
  LOOP
    v_metadata := jsonb_build_object(
      'trigger', 'resource_claim_update',
      'resource_type', v_resource.type,
      'resource_title', v_resource.title,
      'old_status', OLD.status,
      'new_status', NEW.status
    );

    -- Handle events
    IF v_resource.type = 'event' THEN
      -- RSVP created (+5)
      IF OLD.status IS NULL AND NEW.status = 'pending' THEN
        v_points := 5;
        v_action_type := 'rsvp_event';
      -- RSVP rejected (-5)
      ELSIF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
        v_points := -5;
        v_action_type := 'rsvp_rejected';
      -- RSVP cancelled (variable penalty)
      ELSIF OLD.status IN ('pending', 'approved') AND NEW.status = 'cancelled' THEN
        v_points := calculate_event_cancellation_penalty(NEW.timeslot_id);
        v_action_type := 'cancel_rsvp';
        v_metadata := v_metadata || jsonb_build_object('cancellation_timing', 
          CASE 
            WHEN v_points = -5 THEN '>24h before'
            WHEN v_points = -10 THEN '6-24h before'
            WHEN v_points = -20 THEN '<1h before'
          END
        );
      ELSE
        CONTINUE; -- Skip other status changes for events
      END IF;

    -- Handle requests
    ELSIF v_resource.type = 'request' THEN
      -- Answer a request (+100)
      IF OLD.status IN ('pending', 'interested') AND NEW.status = 'approved' THEN
        v_points := 100;
        v_action_type := 'answer_request';
      -- Cancel answer (-110)
      ELSIF OLD.status = 'approved' AND NEW.status = 'cancelled' THEN
        v_points := -110;
        v_action_type := 'cancel_answer';
      -- Complete request (+500)
      ELSIF OLD.status IN ('approved', 'given', 'received') AND NEW.status = 'completed' THEN
        v_points := 500;
        v_action_type := 'complete_request';
      ELSE
        CONTINUE; -- Skip other status changes for requests
      END IF;

    ELSE
      CONTINUE; -- Skip offers and other types
    END IF;

    -- Update trust score
    PERFORM update_trust_score(
      NEW.claimant_id,
      v_community_id,
      v_action_type,
      NEW.id,
      v_points,
      v_metadata
    );
  END LOOP;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trust_score_on_claim_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trust_score_on_membership_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  PERFORM update_trust_score(
    NEW.user_id,
    NEW.community_id,
    'join_community',
    NEW.community_id,
    50,
    jsonb_build_object('trigger', 'community_membership_insert')
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trust_score_on_membership_insert"() OWNER TO "postgres";


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
      'create_offer',
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


ALTER FUNCTION "public"."trust_score_on_resource_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trust_score_on_shoutout_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Award points to receiver
  PERFORM update_trust_score(
    NEW.receiver_id,
    NEW.community_id,
    'receive_shoutout',
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
    'send_shoutout',
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


ALTER FUNCTION "public"."trust_score_on_shoutout_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_community_member_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  target_community_id uuid;
  new_count integer;
BEGIN
  -- Determine which community_id to update based on the operation
  IF TG_OP = 'DELETE' THEN
    target_community_id := OLD.community_id;
  ELSE
    target_community_id := NEW.community_id;
  END IF;

  -- Count the actual number of members for this community
  SELECT COUNT(*)
  INTO new_count
  FROM community_memberships
  WHERE community_id = target_community_id;

  -- Update the member_count in the communities table
  UPDATE communities
  SET member_count = new_count,
      updated_at = now()
  WHERE id = target_community_id;

  -- Return the appropriate record based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;


ALTER FUNCTION "public"."update_community_member_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_on_new_message"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Update the conversation's last_message_id and last_activity_at
    UPDATE conversations 
    SET 
        last_message_id = NEW.id,
        last_activity_at = NEW.created_at,
        updated_at = now()
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conversation_on_new_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversations_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conversations_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_direct_messages_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_direct_messages_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_gathering_attendee_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    gathering_id_val UUID;
BEGIN
    -- Determine which gathering to update based on the operation
    IF TG_OP = 'DELETE' THEN
        gathering_id_val := OLD.gathering_id;
    ELSE
        gathering_id_val := NEW.gathering_id;
    END IF;
    
    -- Update the attendee count for the gathering
    UPDATE gatherings 
    SET attendee_count = (
        SELECT COUNT(*) 
        FROM gathering_responses 
        WHERE gathering_id = gathering_id_val 
        AND status = 'attending'
    )
    WHERE id = gathering_id_val;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;


ALTER FUNCTION "public"."update_gathering_attendee_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_trust_score"("p_user_id" "text", "p_community_id" "text", "p_action_type" "public"."trust_score_action_type", "p_action_id" "text", "p_points_change" integer, "p_metadata" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
  
  -- Log the trust score change with UUID casting for all UUID columns
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
    p_action_id::UUID,  -- Cast action_id to UUID as well
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
$$;


ALTER FUNCTION "public"."update_trust_score"("p_user_id" "text", "p_community_id" "text", "p_action_type" "public"."trust_score_action_type", "p_action_id" "text", "p_points_change" integer, "p_metadata" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_trust_score"("p_user_id" "text", "p_community_id" "text", "p_action_type" "public"."trust_score_action_type", "p_action_id" "text", "p_points_change" integer, "p_metadata" "jsonb") IS 'Centralized function for updating trust scores and logging all changes with proper error handling. Handles UUID casting for all UUID columns while accepting TEXT parameters for compatibility.';



CREATE OR REPLACE FUNCTION "public"."update_trust_score"("p_user_id" "uuid", "p_community_id" "uuid", "p_action_type" "text", "p_action_id" "uuid", "p_points_change" integer, "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_current_score INTEGER;
  v_new_score INTEGER;
BEGIN
  -- Get current score or default to 0
  SELECT COALESCE(score, 0) INTO v_current_score
  FROM trust_scores
  WHERE user_id = p_user_id AND community_id = p_community_id;

  -- If no record exists, insert with default 0
  IF NOT FOUND THEN
    v_current_score := 0;
    INSERT INTO trust_scores (user_id, community_id, score)
    VALUES (p_user_id, p_community_id, 0);
  END IF;

  -- Calculate new score (ensure it doesn't go below 0)
  v_new_score := GREATEST(0, v_current_score + p_points_change);

  -- Update the score
  UPDATE trust_scores
  SET score = v_new_score,
      updated_at = NOW(),
      last_calculated_at = NOW()
  WHERE user_id = p_user_id AND community_id = p_community_id;

  -- Log the change
  INSERT INTO trust_score_logs (
    user_id, 
    community_id, 
    action_type, 
    action_id, 
    points_change, 
    score_before, 
    score_after, 
    metadata
  ) VALUES (
    p_user_id,
    p_community_id,
    p_action_type,
    p_action_id,
    p_points_change,
    v_current_score,
    v_new_score,
    p_metadata
  );
END;
$$;


ALTER FUNCTION "public"."update_trust_score"("p_user_id" "uuid", "p_community_id" "uuid", "p_action_type" "text", "p_action_id" "uuid", "p_points_change" integer, "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."communities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "member_count" integer DEFAULT 0 NOT NULL,
    "organizer_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "time_zone" character varying(100) NOT NULL,
    "description" "text",
    "icon" "text",
    "boundary" "jsonb",
    "boundary_geometry" "public"."geometry"(Polygon,4326) DEFAULT NULL::"public"."geometry",
    "center" "public"."geometry"(Point,4326) NOT NULL,
    "banner_image_url" "text",
    "type" "text" DEFAULT 'interest'::"text" NOT NULL,
    "center_name" "text",
    "color" "text",
    CONSTRAINT "boundary_geometry_consistency" CHECK (((("boundary" IS NULL) AND ("boundary_geometry" IS NULL)) OR (("boundary" IS NOT NULL) AND (((("boundary" ->> 'type'::"text") = 'circular'::"text") AND ("boundary_geometry" IS NULL)) OR ((("boundary" ->> 'type'::"text") = 'isochrone'::"text") AND ("boundary_geometry" IS NOT NULL)))))),
    CONSTRAINT "boundary_minutes_valid" CHECK ((("boundary" IS NULL) OR (("boundary" ->> 'type'::"text") <> 'isochrone'::"text") OR (((("boundary" ->> 'minutes'::"text"))::integer > 0) AND ((("boundary" ->> 'minutes'::"text"))::integer <= 60)))),
    CONSTRAINT "boundary_travel_mode_valid" CHECK ((("boundary" IS NULL) OR (("boundary" ->> 'type'::"text") <> 'isochrone'::"text") OR (("boundary" ->> 'travelMode'::"text") = ANY (ARRAY['walking'::"text", 'cycling'::"text", 'driving'::"text"])))),
    CONSTRAINT "communities_boundary_check" CHECK ((("boundary" IS NULL) OR (("boundary" ? 'type'::"text") AND (((("boundary" ->> 'type'::"text") = 'circular'::"text") AND ("boundary" ? 'center'::"text") AND ("boundary" ? 'radiusKm'::"text")) OR ((("boundary" ->> 'type'::"text") = 'isochrone'::"text") AND ("boundary" ? 'travelMode'::"text") AND ("boundary" ? 'travelTimeMin'::"text") AND ("boundary" ? 'polygon'::"text") AND ("boundary" ? 'areaSqKm'::"text")))))),
    CONSTRAINT "communities_type_check" CHECK (("type" = ANY (ARRAY['place'::"text", 'interest'::"text"])))
);


ALTER TABLE "public"."communities" OWNER TO "postgres";


COMMENT ON COLUMN "public"."communities"."type" IS 'Type of community: place (geographic) or interest (topic-based)';



COMMENT ON COLUMN "public"."communities"."center_name" IS 'Human-readable name for the community center location';



CREATE TABLE IF NOT EXISTS "public"."community_memberships" (
    "user_id" "uuid" NOT NULL,
    "community_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."community_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text",
    "data" "jsonb",
    "read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['message'::"text", 'mention'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_metadata" "jsonb" NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resource_claims" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "resource_id" "uuid" NOT NULL,
    "claimant_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "status" "public"."resource_claim_status" DEFAULT 'pending'::"public"."resource_claim_status" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "timeslot_id" "uuid" NOT NULL
);


ALTER TABLE "public"."resource_claims" OWNER TO "postgres";


COMMENT ON TABLE "public"."resource_claims" IS 'Claims/RSVPs for resources and timeslots';



COMMENT ON COLUMN "public"."resource_claims"."resource_id" IS 'Reference to the resource being claimed';



COMMENT ON COLUMN "public"."resource_claims"."claimant_id" IS 'User making the claim';



COMMENT ON COLUMN "public"."resource_claims"."status" IS 'Current status of the claim';



COMMENT ON COLUMN "public"."resource_claims"."notes" IS 'Optional notes from the claimer';



CREATE TABLE IF NOT EXISTS "public"."resource_communities" (
    "resource_id" "uuid" NOT NULL,
    "community_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."resource_communities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resource_responses" (
    "resource_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" character varying(20) DEFAULT 'accepted'::character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "resource_responses_status_check" CHECK ((("status")::"text" = ANY (ARRAY[('accepted'::character varying)::"text", ('interested'::character varying)::"text", ('declined'::character varying)::"text"])))
);


ALTER TABLE "public"."resource_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resource_timeslots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "resource_id" "uuid" NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "public"."resource_timeslot_status" DEFAULT 'active'::"public"."resource_timeslot_status" NOT NULL,
    CONSTRAINT "check_timeslot_times" CHECK (("start_time" < "end_time"))
);


ALTER TABLE "public"."resource_timeslots" OWNER TO "postgres";


COMMENT ON TABLE "public"."resource_timeslots" IS 'Timeslots for time-based resources (events, services, etc.)';



COMMENT ON COLUMN "public"."resource_timeslots"."resource_id" IS 'Reference to the resource this timeslot belongs to';



COMMENT ON COLUMN "public"."resource_timeslots"."start_time" IS 'When this timeslot starts';



COMMENT ON COLUMN "public"."resource_timeslots"."end_time" IS 'When this timeslot ends';



CREATE TABLE IF NOT EXISTS "public"."resources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "image_urls" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "coordinates" "public"."geometry"(Point,4326),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    "location_name" "text",
    "status" "public"."resource_status" DEFAULT 'open'::"public"."resource_status" NOT NULL,
    "claim_limit" integer,
    "requires_approval" boolean DEFAULT false NOT NULL,
    "expires_at" timestamp with time zone,
    "category" "public"."resource_category" NOT NULL,
    "type" "public"."resource_type" NOT NULL,
    "timeslots_flexible" boolean DEFAULT true NOT NULL,
    "claim_limit_per" "public"."resource_claim_limit_per" DEFAULT 'timeslot'::"public"."resource_claim_limit_per" NOT NULL,
    "is_recurring" boolean DEFAULT false NOT NULL,
    CONSTRAINT "resources_title_min_length" CHECK (("char_length"("title") >= 3))
);


ALTER TABLE "public"."resources" OWNER TO "postgres";


COMMENT ON COLUMN "public"."resources"."location_name" IS 'Human-readable location name or address for the resource';



COMMENT ON COLUMN "public"."resources"."status" IS 'Resource lifecycle status: open (accepting claims), completed (successfully finished), cancelled (cancelled before completion)';



COMMENT ON COLUMN "public"."resources"."claim_limit" IS 'Maximum number of claims allowed (nullable - null means unlimited)';



COMMENT ON COLUMN "public"."resources"."requires_approval" IS 'Whether claims need owner approval before being accepted';



COMMENT ON COLUMN "public"."resources"."expires_at" IS 'When this resource expires and stops accepting claims';



COMMENT ON COLUMN "public"."resources"."timeslots_flexible" IS 'Indicates whether non-owners can create timeslots for this resource';



CREATE TABLE IF NOT EXISTS "public"."shoutouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sender_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "receiver_id" "uuid" NOT NULL,
    "resource_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "image_urls" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text") NOT NULL,
    "community_id" "uuid" NOT NULL,
    CONSTRAINT "shoutouts_different_users" CHECK (("sender_id" <> "receiver_id")),
    CONSTRAINT "shoutouts_message_min_length" CHECK (("char_length"("message") >= 5)),
    CONSTRAINT "shoutouts_no_self_shoutouts" CHECK (("sender_id" <> "receiver_id"))
);


ALTER TABLE "public"."shoutouts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trust_score_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "community_id" "uuid",
    "action_type" "public"."trust_score_action_type" NOT NULL,
    "action_id" "uuid",
    "points_change" integer NOT NULL,
    "score_before" integer NOT NULL,
    "score_after" integer NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."trust_score_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trust_scores" (
    "user_id" "uuid" NOT NULL,
    "community_id" "uuid" NOT NULL,
    "score" integer DEFAULT 0 NOT NULL,
    "last_calculated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "trust_scores_score_check" CHECK (("score" >= 0))
);


ALTER TABLE "public"."trust_scores" OWNER TO "postgres";


ALTER TABLE ONLY "public"."communities"
    ADD CONSTRAINT "communities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_memberships"
    ADD CONSTRAINT "community_memberships_pkey" PRIMARY KEY ("user_id", "community_id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resource_claims"
    ADD CONSTRAINT "resource_claims_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resource_claims"
    ADD CONSTRAINT "resource_claims_unique_claim" UNIQUE ("claimant_id", "resource_id", "timeslot_id");



ALTER TABLE ONLY "public"."resource_communities"
    ADD CONSTRAINT "resource_communities_pkey" PRIMARY KEY ("resource_id", "community_id");



ALTER TABLE ONLY "public"."resource_responses"
    ADD CONSTRAINT "resource_responses_pkey" PRIMARY KEY ("resource_id", "user_id");



ALTER TABLE ONLY "public"."resource_timeslots"
    ADD CONSTRAINT "resource_timeslots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resources"
    ADD CONSTRAINT "resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shoutouts"
    ADD CONSTRAINT "thanks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trust_score_logs"
    ADD CONSTRAINT "trust_score_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trust_scores"
    ADD CONSTRAINT "trust_scores_pkey" PRIMARY KEY ("user_id", "community_id");



ALTER TABLE ONLY "public"."community_memberships"
    ADD CONSTRAINT "unique_user_community" UNIQUE ("user_id", "community_id");



CREATE INDEX "communities_boundary_geometry_idx" ON "public"."communities" USING "gist" ("boundary_geometry");



CREATE INDEX "communities_boundary_idx" ON "public"."communities" USING "gin" ("boundary");



CREATE INDEX "communities_center_idx" ON "public"."communities" USING "gist" ("center");



CREATE INDEX "communities_created_at_idx" ON "public"."communities" USING "btree" ("created_at" DESC);



CREATE INDEX "communities_organizer_id_idx" ON "public"."communities" USING "btree" ("organizer_id");



CREATE INDEX "communities_time_zone_idx" ON "public"."communities" USING "btree" ("time_zone");



CREATE INDEX "community_memberships_community_id_idx" ON "public"."community_memberships" USING "btree" ("community_id");



CREATE INDEX "community_memberships_joined_at_idx" ON "public"."community_memberships" USING "btree" ("created_at" DESC);



CREATE INDEX "community_memberships_user_id_idx" ON "public"."community_memberships" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_user_id_read" ON "public"."notifications" USING "btree" ("user_id", "read");



CREATE INDEX "idx_resource_claims_resource_id" ON "public"."resource_claims" USING "btree" ("resource_id");



CREATE INDEX "idx_resource_claims_status" ON "public"."resource_claims" USING "btree" ("status");



CREATE INDEX "idx_resource_claims_user_id" ON "public"."resource_claims" USING "btree" ("claimant_id");



CREATE INDEX "idx_resource_communities_community_id" ON "public"."resource_communities" USING "btree" ("community_id");



CREATE INDEX "idx_resource_communities_resource_id" ON "public"."resource_communities" USING "btree" ("resource_id");



CREATE INDEX "idx_resource_responses_resource_id" ON "public"."resource_responses" USING "btree" ("resource_id");



CREATE INDEX "idx_resource_responses_status" ON "public"."resource_responses" USING "btree" ("status");



CREATE INDEX "idx_resource_responses_user_id" ON "public"."resource_responses" USING "btree" ("user_id");



CREATE INDEX "idx_resource_timeslots_end_time" ON "public"."resource_timeslots" USING "btree" ("end_time");



CREATE INDEX "idx_resource_timeslots_resource_id" ON "public"."resource_timeslots" USING "btree" ("resource_id");



CREATE INDEX "idx_resource_timeslots_start_time" ON "public"."resource_timeslots" USING "btree" ("start_time");



CREATE INDEX "idx_trust_score_logs_action_type" ON "public"."trust_score_logs" USING "btree" ("action_type");



CREATE INDEX "idx_trust_score_logs_community_id" ON "public"."trust_score_logs" USING "btree" ("community_id");



CREATE INDEX "idx_trust_score_logs_created_at" ON "public"."trust_score_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_trust_score_logs_user_id" ON "public"."trust_score_logs" USING "btree" ("user_id");



CREATE INDEX "idx_trust_scores_community_id" ON "public"."trust_scores" USING "btree" ("community_id");



CREATE INDEX "idx_trust_scores_user_id" ON "public"."trust_scores" USING "btree" ("user_id");



CREATE INDEX "resources_coordinates_idx" ON "public"."resources" USING "gist" ("coordinates");



CREATE INDEX "resources_created_at_idx" ON "public"."resources" USING "btree" ("created_at" DESC);



CREATE INDEX "resources_creator_id_idx" ON "public"."resources" USING "btree" ("owner_id");



CREATE INDEX "shoutouts_created_at_idx" ON "public"."shoutouts" USING "btree" ("created_at" DESC);



CREATE INDEX "shoutouts_from_user_id_idx" ON "public"."shoutouts" USING "btree" ("sender_id");



CREATE INDEX "shoutouts_resource_id_idx" ON "public"."shoutouts" USING "btree" ("resource_id");



CREATE INDEX "shoutouts_to_user_id_idx" ON "public"."shoutouts" USING "btree" ("receiver_id");



CREATE OR REPLACE TRIGGER "auto_add_organizer_membership_trigger" AFTER INSERT ON "public"."communities" FOR EACH ROW EXECUTE FUNCTION "public"."auto_add_organizer_to_community_memberships"();



COMMENT ON TRIGGER "auto_add_organizer_membership_trigger" ON "public"."communities" IS 'Automatically adds community organizer to community_memberships table when a new community is created. Replaces the old auto_create_organizer_membership_trigger with better error handling and member count updates.';



CREATE OR REPLACE TRIGGER "auto_create_timeslot_claim_trigger" AFTER INSERT ON "public"."resource_timeslots" FOR EACH ROW EXECUTE FUNCTION "public"."auto_create_timeslot_claim"();



COMMENT ON TRIGGER "auto_create_timeslot_claim_trigger" ON "public"."resource_timeslots" IS 'Automatically creates a claim for the user when they create a timeslot';



CREATE OR REPLACE TRIGGER "award_trust_points_community_creation_trigger" AFTER INSERT ON "public"."communities" FOR EACH ROW EXECUTE FUNCTION "public"."award_trust_points_for_community_creation"();



CREATE OR REPLACE TRIGGER "community_memberships_delete_trigger" AFTER DELETE ON "public"."community_memberships" FOR EACH ROW EXECUTE FUNCTION "public"."update_community_member_count"();



CREATE OR REPLACE TRIGGER "community_memberships_insert_trigger" AFTER INSERT ON "public"."community_memberships" FOR EACH ROW EXECUTE FUNCTION "public"."update_community_member_count"();



CREATE OR REPLACE TRIGGER "community_memberships_update_trigger" AFTER UPDATE ON "public"."community_memberships" FOR EACH ROW WHEN (("old"."community_id" IS DISTINCT FROM "new"."community_id")) EXECUTE FUNCTION "public"."update_community_member_count"();



CREATE OR REPLACE TRIGGER "handle_notifications_updated_at" BEFORE UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "trust_score_on_claim_insert_trigger" AFTER INSERT ON "public"."resource_claims" FOR EACH ROW EXECUTE FUNCTION "public"."trust_score_on_claim_insert"();



CREATE OR REPLACE TRIGGER "trust_score_on_claim_update_trigger" AFTER UPDATE ON "public"."resource_claims" FOR EACH ROW EXECUTE FUNCTION "public"."trust_score_on_claim_update"();



CREATE OR REPLACE TRIGGER "trust_score_on_membership_insert_trigger" AFTER INSERT ON "public"."community_memberships" FOR EACH ROW EXECUTE FUNCTION "public"."trust_score_on_membership_insert"();



CREATE OR REPLACE TRIGGER "trust_score_on_resource_insert_trigger" AFTER INSERT ON "public"."resources" FOR EACH ROW EXECUTE FUNCTION "public"."trust_score_on_resource_insert"();



CREATE OR REPLACE TRIGGER "trust_score_on_shoutout_insert_trigger" AFTER INSERT ON "public"."shoutouts" FOR EACH ROW EXECUTE FUNCTION "public"."trust_score_on_shoutout_insert"();



CREATE OR REPLACE TRIGGER "update_communities_updated_at" BEFORE UPDATE ON "public"."communities" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_community_memberships_updated_at" BEFORE UPDATE ON "public"."community_memberships" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_resource_claims_updated_at" BEFORE UPDATE ON "public"."resource_claims" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_resource_communities_updated_at" BEFORE UPDATE ON "public"."resource_communities" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_resource_responses_updated_at" BEFORE UPDATE ON "public"."resource_responses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_resource_timeslots_updated_at" BEFORE UPDATE ON "public"."resource_timeslots" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_resources_updated_at" BEFORE UPDATE ON "public"."resources" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_shoutouts_updated_at" BEFORE UPDATE ON "public"."shoutouts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."communities"
    ADD CONSTRAINT "communities_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



COMMENT ON CONSTRAINT "communities_organizer_id_fkey" ON "public"."communities" IS 'Foreign key to profiles table. Prevents deletion of users who are organizers of communities.';



ALTER TABLE ONLY "public"."community_memberships"
    ADD CONSTRAINT "community_memberships_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_memberships"
    ADD CONSTRAINT "community_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_memberships"
    ADD CONSTRAINT "community_memberships_user_id_fkey1" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shoutouts"
    ADD CONSTRAINT "fk_shoutouts_community_id" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resource_claims"
    ADD CONSTRAINT "resource_claims_claimant_id_fkey" FOREIGN KEY ("claimant_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resource_claims"
    ADD CONSTRAINT "resource_claims_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resource_claims"
    ADD CONSTRAINT "resource_claims_timeslot_id_fkey" FOREIGN KEY ("timeslot_id") REFERENCES "public"."resource_timeslots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resource_communities"
    ADD CONSTRAINT "resource_communities_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resource_communities"
    ADD CONSTRAINT "resource_communities_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resource_responses"
    ADD CONSTRAINT "resource_responses_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resource_responses"
    ADD CONSTRAINT "resource_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resource_timeslots"
    ADD CONSTRAINT "resource_timeslots_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resources"
    ADD CONSTRAINT "resources_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shoutouts"
    ADD CONSTRAINT "shoutouts_from_user_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."shoutouts"
    ADD CONSTRAINT "shoutouts_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shoutouts"
    ADD CONSTRAINT "shoutouts_to_user_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."trust_score_logs"
    ADD CONSTRAINT "trust_score_logs_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trust_score_logs"
    ADD CONSTRAINT "trust_score_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trust_scores"
    ADD CONSTRAINT "trust_scores_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trust_scores"
    ADD CONSTRAINT "trust_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Allow public read access to shoutouts" ON "public"."shoutouts" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can create communities" ON "public"."communities" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "organizer_id"));



CREATE POLICY "Authenticated users can insert their own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Authenticated users can join communities" ON "public"."community_memberships" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Authenticated users can view profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Claim users can manage their claim status" ON "public"."resource_claims" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "claimant_id")) WITH CHECK ((("auth"."uid"() = "claimant_id") AND (("status" = ANY (ARRAY['pending'::"public"."resource_claim_status", 'cancelled'::"public"."resource_claim_status", 'interested'::"public"."resource_claim_status"])) OR (("status" = 'approved'::"public"."resource_claim_status") AND (EXISTS ( SELECT 1
   FROM "public"."resources"
  WHERE (("resources"."id" = "resource_claims"."resource_id") AND ("resources"."requires_approval" = false))))))));



CREATE POLICY "Communities are publicly viewable" ON "public"."communities" FOR SELECT USING (true);



CREATE POLICY "Community members can create shoutouts" ON "public"."shoutouts" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "sender_id") AND ("auth"."uid"() IN ( SELECT "community_memberships"."user_id"
   FROM "public"."community_memberships"
  WHERE ("community_memberships"."community_id" = "shoutouts"."community_id")))));



CREATE POLICY "Community members can create timeslots" ON "public"."resource_timeslots" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_resource_owner"("resource_id", "auth"."uid"()) OR ("public"."is_community_member_of_resource"("resource_id", "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."resources"
  WHERE (("resources"."id" = "resource_timeslots"."resource_id") AND ("resources"."timeslots_flexible" = true)))))));



CREATE POLICY "Community members can view shoutouts" ON "public"."shoutouts" FOR SELECT TO "authenticated" USING (("auth"."uid"() IN ( SELECT "community_memberships"."user_id"
   FROM "public"."community_memberships"
  WHERE ("community_memberships"."community_id" = "shoutouts"."community_id"))));



CREATE POLICY "Community organizers can delete their communities" ON "public"."communities" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "organizer_id"));



CREATE POLICY "Community organizers can manage memberships" ON "public"."community_memberships" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."communities" "c"
  WHERE (("c"."id" = "community_memberships"."community_id") AND ("c"."organizer_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."communities" "c"
  WHERE (("c"."id" = "community_memberships"."community_id") AND ("c"."organizer_id" = "auth"."uid"())))));



CREATE POLICY "Community organizers can update their communities" ON "public"."communities" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "organizer_id"));



CREATE POLICY "Resource owners can delete their resources" ON "public"."resources" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Resource owners can delete timeslots" ON "public"."resource_timeslots" FOR DELETE TO "authenticated" USING ("public"."is_resource_owner"("resource_id", "auth"."uid"()));



CREATE POLICY "Resource owners can manage workflow states except cancelled" ON "public"."resource_claims" FOR UPDATE TO "authenticated" USING (("auth"."uid"() IN ( SELECT "resources"."owner_id"
   FROM "public"."resources"
  WHERE ("resources"."id" = "resource_claims"."resource_id")))) WITH CHECK ((("auth"."uid"() IN ( SELECT "resources"."owner_id"
   FROM "public"."resources"
  WHERE ("resources"."id" = "resource_claims"."resource_id"))) AND ("status" = ANY (ARRAY['pending'::"public"."resource_claim_status", 'approved'::"public"."resource_claim_status", 'rejected'::"public"."resource_claim_status", 'completed'::"public"."resource_claim_status"]))));



CREATE POLICY "Resource owners can update their resources" ON "public"."resources" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Resource owners can update timeslots" ON "public"."resource_timeslots" FOR UPDATE TO "authenticated" USING ("public"."is_resource_owner"("resource_id", "auth"."uid"()));



CREATE POLICY "Resource owners or claim users can delete claims" ON "public"."resource_claims" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "claimant_id") OR ("auth"."uid"() IN ( SELECT "resources"."owner_id"
   FROM "public"."resources"
  WHERE ("resources"."id" = "resource_claims"."resource_id")))));



CREATE POLICY "Service role can create notifications" ON "public"."notifications" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Service role can insert profiles" ON "public"."profiles" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Shoutout creators can delete their shoutouts" ON "public"."shoutouts" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "sender_id"));



CREATE POLICY "Shoutout creators can update their shoutouts" ON "public"."shoutouts" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "sender_id"));



CREATE POLICY "Trust scores are publicly readable" ON "public"."trust_scores" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can delete their own notifications" ON "public"."notifications" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own resource responses" ON "public"."resource_responses" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can leave or organizers can remove members" ON "public"."community_memberships" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."communities" "c"
  WHERE (("c"."id" = "community_memberships"."community_id") AND ("c"."organizer_id" = "auth"."uid"()))))));



CREATE POLICY "Users can manage resource-community associations for resources" ON "public"."resource_communities" USING ((EXISTS ( SELECT 1
   FROM "public"."community_memberships" "cm"
  WHERE (("cm"."community_id" = "resource_communities"."community_id") AND ("cm"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own resource responses" ON "public"."resource_responses" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view community memberships" ON "public"."community_memberships" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view resource-community associations for their commun" ON "public"."resource_communities" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."community_memberships" "cm"
  WHERE (("cm"."community_id" = "resource_communities"."community_id") AND ("cm"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own membership and organizers can view all" ON "public"."community_memberships" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."communities" "c"
  WHERE (("c"."id" = "community_memberships"."community_id") AND ("c"."organizer_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own trust score logs" ON "public"."trust_score_logs" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."communities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "community_members_can_create_resource_claims" ON "public"."resource_claims" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."resources" "r"
     JOIN "public"."resource_communities" "rc" ON (("r"."id" = "rc"."resource_id")))
     JOIN "public"."community_memberships" "cm" ON (("rc"."community_id" = "cm"."community_id")))
  WHERE (("r"."id" = "resource_claims"."resource_id") AND ("cm"."user_id" = "auth"."uid"())))));



CREATE POLICY "community_members_can_create_resource_responses" ON "public"."resource_responses" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."resources" "r"
     JOIN "public"."resource_communities" "rc" ON (("r"."id" = "rc"."resource_id")))
     JOIN "public"."community_memberships" "cm" ON (("rc"."community_id" = "cm"."community_id")))
  WHERE (("r"."id" = "resource_responses"."resource_id") AND ("cm"."user_id" = "auth"."uid"())))));



CREATE POLICY "community_members_can_create_resources" ON "public"."resources" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "community_members_can_view_resource_claims" ON "public"."resource_claims" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."resources" "r"
     JOIN "public"."resource_communities" "rc" ON (("r"."id" = "rc"."resource_id")))
     JOIN "public"."community_memberships" "cm" ON (("rc"."community_id" = "cm"."community_id")))
  WHERE (("r"."id" = "resource_claims"."resource_id") AND ("cm"."user_id" = "auth"."uid"())))));



CREATE POLICY "community_members_can_view_resource_responses" ON "public"."resource_responses" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."resources" "r"
     JOIN "public"."resource_communities" "rc" ON (("r"."id" = "rc"."resource_id")))
     JOIN "public"."community_memberships" "cm" ON (("rc"."community_id" = "cm"."community_id")))
  WHERE (("r"."id" = "resource_responses"."resource_id") AND ("cm"."user_id" = "auth"."uid"())))));



CREATE POLICY "community_members_can_view_resource_timeslots" ON "public"."resource_timeslots" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."resources" "r"
     JOIN "public"."resource_communities" "rc" ON (("r"."id" = "rc"."resource_id")))
     JOIN "public"."community_memberships" "cm" ON (("rc"."community_id" = "cm"."community_id")))
  WHERE (("r"."id" = "resource_timeslots"."resource_id") AND ("cm"."user_id" = "auth"."uid"())))));



CREATE POLICY "community_members_can_view_resources" ON "public"."resources" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."resource_communities" "rc"
     JOIN "public"."community_memberships" "cm" ON (("rc"."community_id" = "cm"."community_id")))
  WHERE (("rc"."resource_id" = "resources"."id") AND ("cm"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."community_memberships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "owners_can_manage_resources" ON "public"."resources" USING (("auth"."uid"() = "owner_id"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resource_claims" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resource_communities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resource_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resource_timeslots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resources" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "shoutout_to_user_must_match_resource_owner_insert" ON "public"."shoutouts" FOR INSERT TO "authenticated" WITH CHECK (("receiver_id" = ( SELECT "resources"."owner_id"
   FROM "public"."resources"
  WHERE ("resources"."id" = "shoutouts"."resource_id"))));



CREATE POLICY "shoutout_to_user_must_match_resource_owner_update" ON "public"."shoutouts" FOR UPDATE TO "authenticated" USING (("receiver_id" = ( SELECT "resources"."owner_id"
   FROM "public"."resources"
  WHERE ("resources"."id" = "shoutouts"."resource_id")))) WITH CHECK (("receiver_id" = ( SELECT "resources"."owner_id"
   FROM "public"."resources"
  WHERE ("resources"."id" = "shoutouts"."resource_id"))));



ALTER TABLE "public"."shoutouts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trust_score_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trust_scores" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_add_organizer_attendance"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_add_organizer_attendance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_add_organizer_attendance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_add_organizer_to_community_memberships"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_add_organizer_to_community_memberships"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_add_organizer_to_community_memberships"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_add_organizer_to_event_attendances"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_add_organizer_to_event_attendances"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_add_organizer_to_event_attendances"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_create_timeslot_claim"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_create_timeslot_claim"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_create_timeslot_claim"() TO "service_role";



GRANT ALL ON FUNCTION "public"."award_trust_points_for_community_creation"() TO "anon";
GRANT ALL ON FUNCTION "public"."award_trust_points_for_community_creation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."award_trust_points_for_community_creation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_community_area"("community_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_community_area"("community_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_community_area"("community_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_event_cancellation_penalty"("p_timeslot_id" "uuid", "p_cancelled_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_event_cancellation_penalty"("p_timeslot_id" "uuid", "p_cancelled_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_event_cancellation_penalty"("p_timeslot_id" "uuid", "p_cancelled_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."communities_containing_point"("lat" numeric, "lng" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."communities_containing_point"("lat" numeric, "lng" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."communities_containing_point"("lat" numeric, "lng" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."estimate_population"("lat" numeric, "lng" numeric, "radius_km" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."estimate_population"("lat" numeric, "lng" numeric, "radius_km" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."estimate_population"("lat" numeric, "lng" numeric, "radius_km" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_boundary_polygon"("community_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_boundary_polygon"("community_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_boundary_polygon"("community_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_community_member_of_resource"("resource_uuid" "uuid", "user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_community_member_of_resource"("resource_uuid" "uuid", "user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_community_member_of_resource"("resource_uuid" "uuid", "user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_resource_owner"("resource_uuid" "uuid", "user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_resource_owner"("resource_uuid" "uuid", "user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_resource_owner"("resource_uuid" "uuid", "user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_new_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_new_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_new_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."store_circular_boundary"("community_id" "uuid", "boundary_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."store_circular_boundary"("community_id" "uuid", "boundary_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."store_circular_boundary"("community_id" "uuid", "boundary_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."store_isochrone_boundary"("community_id" "uuid", "boundary_data" "jsonb", "original_polygon" "public"."geometry") TO "anon";
GRANT ALL ON FUNCTION "public"."store_isochrone_boundary"("community_id" "uuid", "boundary_data" "jsonb", "original_polygon" "public"."geometry") TO "authenticated";
GRANT ALL ON FUNCTION "public"."store_isochrone_boundary"("community_id" "uuid", "boundary_data" "jsonb", "original_polygon" "public"."geometry") TO "service_role";



GRANT ALL ON FUNCTION "public"."trust_score_on_claim_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."trust_score_on_claim_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trust_score_on_claim_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trust_score_on_claim_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."trust_score_on_claim_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trust_score_on_claim_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trust_score_on_membership_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."trust_score_on_membership_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trust_score_on_membership_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trust_score_on_resource_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."trust_score_on_resource_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trust_score_on_resource_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trust_score_on_shoutout_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."trust_score_on_shoutout_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trust_score_on_shoutout_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_community_member_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_community_member_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_community_member_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_on_new_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_on_new_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_on_new_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversations_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversations_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversations_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_direct_messages_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_direct_messages_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_direct_messages_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_gathering_attendee_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_gathering_attendee_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_gathering_attendee_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_trust_score"("p_user_id" "text", "p_community_id" "text", "p_action_type" "public"."trust_score_action_type", "p_action_id" "text", "p_points_change" integer, "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_trust_score"("p_user_id" "text", "p_community_id" "text", "p_action_type" "public"."trust_score_action_type", "p_action_id" "text", "p_points_change" integer, "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_trust_score"("p_user_id" "text", "p_community_id" "text", "p_action_type" "public"."trust_score_action_type", "p_action_id" "text", "p_points_change" integer, "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_trust_score"("p_user_id" "uuid", "p_community_id" "uuid", "p_action_type" "text", "p_action_id" "uuid", "p_points_change" integer, "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_trust_score"("p_user_id" "uuid", "p_community_id" "uuid", "p_action_type" "text", "p_action_id" "uuid", "p_points_change" integer, "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_trust_score"("p_user_id" "uuid", "p_community_id" "uuid", "p_action_type" "text", "p_action_id" "uuid", "p_points_change" integer, "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."communities" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."communities" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."communities" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."community_memberships" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."community_memberships" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."community_memberships" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."notifications" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."notifications" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."notifications" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "anon";
GRANT SELECT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."resource_claims" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."resource_claims" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."resource_claims" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."resource_communities" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."resource_communities" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."resource_communities" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."resource_responses" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."resource_responses" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."resource_responses" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."resource_timeslots" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."resource_timeslots" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."resource_timeslots" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."resources" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."resources" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."resources" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."shoutouts" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."shoutouts" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."shoutouts" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."trust_score_logs" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."trust_score_logs" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."trust_score_logs" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."trust_scores" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."trust_scores" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."trust_scores" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "service_role";






--
-- Critical trigger for profile creation when users sign up
--
CREATE OR REPLACE TRIGGER "on_auth_user_created" AFTER INSERT ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();

RESET ALL;
