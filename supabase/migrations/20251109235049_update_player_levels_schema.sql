-- Update player_levels table schema with new structure
-- Changes:
-- - Rename level_index to level (now represents actual level 1-31)
-- - Replace min_score/max_score with points_needed
-- - Add unlocked_powers array of player_action enum

-- Create player_action enum for unlocked powers
CREATE TYPE player_action AS ENUM (
  'view_public_resources',
  'create_claims',
  'view_agenda',
  'create_offer',
  'create_single_event',
  'vote_event_time',
  'create_request',
  'create_recurring_event',
  'invite_friend',
  'send_cold_call_message',
  'send_community_message',
  'view_community_map',
  'join_another_community'
);

-- Drop existing table and recreate with new schema
DROP TABLE IF EXISTS player_levels CASCADE;

CREATE TABLE player_levels (
  level INTEGER PRIMARY KEY,
  emoji TEXT NOT NULL,
  name TEXT NOT NULL,
  points_needed INTEGER NOT NULL,
  unlocked_powers player_action[] NULL
);

-- Insert 31 player levels
INSERT INTO player_levels (level, emoji, name, points_needed, unlocked_powers) VALUES
  (1, '🦠', 'Plankton', 0, ARRAY['view_public_resources']::player_action[]),
  (2, '🐣', 'Hatchling', 100, ARRAY['create_claims']::player_action[]),
  (3, '🦐', 'Shrimp', 240, ARRAY['view_agenda']::player_action[]),
  (4, '🦀', 'Crab', 436, ARRAY['create_offer', 'create_single_event']::player_action[]),
  (5, '🦞', 'Lobster', 710, ARRAY['vote_event_time']::player_action[]),
  (6, '🪼', 'Jellyfish', 1095, ARRAY['create_request']::player_action[]),
  (7, '🐠', 'Angelfish', 1632, ARRAY['create_recurring_event']::player_action[]),
  (8, '🐡', 'Pufferfish', 2385, ARRAY['invite_friend']::player_action[]),
  (9, '🐟', 'Big Tuna', 3439, ARRAY['send_cold_call_message']::player_action[]),
  (10, '🦑', 'Squid', 4915, ARRAY['send_community_message']::player_action[]),
  (11, '🐢', 'Sea Turtle', 6981, ARRAY['view_community_map']::player_action[]),
  (12, '🐙', 'Octopus', 9874, ARRAY['join_another_community']::player_action[]),
  (13, '🦦', 'Otter', 13923, NULL),
  (14, '🦭', 'Seal', 19593, NULL),
  (15, '🐧', 'Penguin', 27530, NULL),
  (16, '🐬', 'Dolphin', 38642, NULL),
  (17, '🐋', 'Orca', 54199, NULL),
  (18, '🐳', 'Sperm Whale', 75978, NULL),
  (19, '🐋', 'Blue Whale', 106470, NULL),
  (20, '🧜', 'Mermaid', 149158, NULL),
  (21, '🌊', 'Ocean', 208921, NULL),
  (22, '🔱', 'Poseidon', 292589, NULL),
  (23, '🌎', 'Gaia', 409724, NULL),
  (24, '🌙', 'Moon', 573714, NULL),
  (25, '☀️', 'Sun', 803300, NULL),
  (26, '🪐', 'Solar System', 1124720, NULL),
  (27, '🌠', 'Shooting Star', 1574708, NULL),
  (28, '☄️', 'Comet', 2204691, NULL),
  (29, '🌟', 'North Star', 3086667, NULL),
  (30, '🌌', 'Galaxy', 4321434, NULL),
  (31, '♾️', 'Infinity', 6050108, NULL);

-- Update calculate_trust_level function to use new schema
CREATE OR REPLACE FUNCTION calculate_trust_level(p_score INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_level INTEGER;
BEGIN
  -- Handle negative scores
  IF p_score < 0 THEN
    p_score := 0;
  END IF;

  -- Find the highest level where score >= points_needed
  SELECT level INTO v_level
  FROM player_levels
  WHERE p_score >= points_needed
  ORDER BY level DESC
  LIMIT 1;

  -- Return level, default to 1 if not found
  RETURN COALESCE(v_level, 1);
END;
$$;

-- Add new action_type enum values for the action_points table
-- These granular action types will be used to configure point values

-- Community & Profile
ALTER TYPE action_type ADD VALUE 'community.created';
ALTER TYPE action_type ADD VALUE 'profile.picture.set';
ALTER TYPE action_type ADD VALUE 'profile.bio.written';
ALTER TYPE action_type ADD VALUE 'invitation.accepted';

-- Offer-related actions
ALTER TYPE action_type ADD VALUE 'resource.offer.created';
ALTER TYPE action_type ADD VALUE 'claim.offer.created';
ALTER TYPE action_type ADD VALUE 'claim.offer.received';
ALTER TYPE action_type ADD VALUE 'claim.offer.approved';
ALTER TYPE action_type ADD VALUE 'claim.offer.rejected';
ALTER TYPE action_type ADD VALUE 'claim.offer.ignored';
ALTER TYPE action_type ADD VALUE 'resource.offer.given';
ALTER TYPE action_type ADD VALUE 'resource.offer.recurring.created';
ALTER TYPE action_type ADD VALUE 'shoutout.offer.sent.claimant';
ALTER TYPE action_type ADD VALUE 'shoutout.offer.received.claimant';
ALTER TYPE action_type ADD VALUE 'shoutout.offer.sent.owner';
ALTER TYPE action_type ADD VALUE 'shoutout.offer.received.owner';

-- Event-related actions
ALTER TYPE action_type ADD VALUE 'resource.event.created';
ALTER TYPE action_type ADD VALUE 'claim.event.going';
ALTER TYPE action_type ADD VALUE 'claim.event.attended';
ALTER TYPE action_type ADD VALUE 'claim.event.attendance';
ALTER TYPE action_type ADD VALUE 'resource.event.vote.created';
ALTER TYPE action_type ADD VALUE 'resource.event.recurring.created';
ALTER TYPE action_type ADD VALUE 'shoutout.event.sent.claimant';
ALTER TYPE action_type ADD VALUE 'shoutout.event.received.claimant';
ALTER TYPE action_type ADD VALUE 'shoutout.event.sent.owner';
ALTER TYPE action_type ADD VALUE 'shoutout.event.received.owner';

-- Request-related actions
ALTER TYPE action_type ADD VALUE 'resource.request.created';
ALTER TYPE action_type ADD VALUE 'claim.request.created';
ALTER TYPE action_type ADD VALUE 'claim.request.completed';
ALTER TYPE action_type ADD VALUE 'claim.request.given';
ALTER TYPE action_type ADD VALUE 'claim.request.approved';
ALTER TYPE action_type ADD VALUE 'claim.request.rejected';
ALTER TYPE action_type ADD VALUE 'claim.request.ignored';
ALTER TYPE action_type ADD VALUE 'resource.request.received';
ALTER TYPE action_type ADD VALUE 'shoutout.request.sent.claimant';
ALTER TYPE action_type ADD VALUE 'shoutout.request.received.claimant';
ALTER TYPE action_type ADD VALUE 'shoutout.request.sent.owner';
ALTER TYPE action_type ADD VALUE 'shoutout.request.received.owner';

-- General actions
ALTER TYPE action_type ADD VALUE 'resource.image.added';

COMMENT ON TYPE action_type IS 'Extended to include granular action types for offers, events, requests, and their associated workflows';

-- Note: action_points table creation and population moved to next migration to avoid
-- PostgreSQL restriction on using newly added enum values in same transaction
