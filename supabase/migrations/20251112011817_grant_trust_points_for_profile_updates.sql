-- ============================================================================
-- MIGRATION: Grant Trust Points for Profile Updates
-- Created: 2025-11-12
-- Purpose: Award trust score points when users set their profile picture
--          or bio for the first time. Points are awarded in each community
--          the user is a member of.
-- ============================================================================

-- ============================================================================
-- Create trigger function for profile updates
-- ============================================================================
CREATE OR REPLACE FUNCTION trust_score_on_profile_update()
RETURNS TRIGGER AS $$
DECLARE
  v_community_id UUID;
  v_avatar_points INTEGER;
  v_bio_points INTEGER;
  v_old_avatar TEXT;
  v_new_avatar TEXT;
  v_old_bio TEXT;
  v_new_bio TEXT;
BEGIN
  -- Extract avatar_url from old and new metadata
  v_old_avatar := OLD.user_metadata->>'avatar_url';
  v_new_avatar := NEW.user_metadata->>'avatar_url';

  -- Extract bio from old and new metadata
  v_old_bio := OLD.user_metadata->>'bio';
  v_new_bio := NEW.user_metadata->>'bio';

  -- Check if avatar_url was set for the first time (NULL -> non-NULL)
  IF (v_old_avatar IS NULL OR v_old_avatar = '') AND
     (v_new_avatar IS NOT NULL AND v_new_avatar != '') THEN

    -- Query action_points for profile.picture.set
    SELECT points INTO v_avatar_points
    FROM action_points
    WHERE action_type = 'profile.picture.set'::action_type;

    -- Award points in each community the user is a member of
    FOR v_community_id IN
      SELECT community_id
      FROM community_memberships
      WHERE user_id = NEW.id
    LOOP
      PERFORM update_trust_score(
        NEW.id,
        v_community_id,
        'profile.picture.set'::action_type,
        NEW.id,
        v_avatar_points,
        jsonb_build_object(
          'trigger', 'profile.picture.set',
          'avatar_url', v_new_avatar
        )
      );
    END LOOP;
  END IF;

  -- Check if bio was set for the first time (NULL/empty -> non-NULL/non-empty)
  IF (v_old_bio IS NULL OR v_old_bio = '') AND
     (v_new_bio IS NOT NULL AND v_new_bio != '') THEN

    -- Query action_points for profile.bio.written
    SELECT points INTO v_bio_points
    FROM action_points
    WHERE action_type = 'profile.bio.written'::action_type;

    -- Award points in each community the user is a member of
    FOR v_community_id IN
      SELECT community_id
      FROM community_memberships
      WHERE user_id = NEW.id
    LOOP
      PERFORM update_trust_score(
        NEW.id,
        v_community_id,
        'profile.bio.written'::action_type,
        NEW.id,
        v_bio_points,
        jsonb_build_object(
          'trigger', 'profile.bio.written',
          'bio_length', LENGTH(v_new_bio)
        )
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Create trigger on profiles table
-- ============================================================================
DROP TRIGGER IF EXISTS trust_score_on_profile_update_trigger ON profiles;

CREATE TRIGGER trust_score_on_profile_update_trigger
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trust_score_on_profile_update();

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
