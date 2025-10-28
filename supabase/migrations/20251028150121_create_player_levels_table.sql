-- Create player_levels table to store trust score level configuration
CREATE TABLE IF NOT EXISTS player_levels (
  level_index INTEGER PRIMARY KEY,
  emoji TEXT NOT NULL,
  name TEXT NOT NULL,
  min_score INTEGER NOT NULL,
  max_score INTEGER
);

-- Populate with 20 player levels
INSERT INTO player_levels (level_index, emoji, name, min_score, max_score) VALUES
  (0, '🦠', 'Plankton', 0, 50),
  (1, '🐚', 'Hermit Crab', 50, 100),
  (2, '🦐', 'Shrimp', 100, 200),
  (3, '🦀', 'Crab', 200, 350),
  (4, '🐌', 'Sea Snail', 350, 500),
  (5, '🦞', 'Lobster', 500, 750),
  (6, '⭐', 'Starfish', 750, 1000),
  (7, '🪼', 'Jellyfish', 1000, 1500),
  (8, '🐠', 'Clownfish', 1500, 2000),
  (9, '🐟', 'Tuna', 2000, 3000),
  (10, '🐡', 'Pufferfish', 3000, 4000),
  (11, '🦑', 'Squid', 4000, 5500),
  (12, '🐙', 'Octopus', 5500, 7500),
  (13, '🐢', 'Sea Turtle', 7500, 10000),
  (14, '🦦', 'Sea Otter', 10000, 13000),
  (15, '🐧', 'Penguin', 13000, 17000),
  (16, '🦭', 'Seal', 17000, 22000),
  (17, '🦈', 'Shark', 22000, 28000),
  (18, '🐬', 'Dolphin', 28000, 35000),
  (19, '🐋', 'Whale', 35000, NULL);

-- Create function to calculate trust level from score
CREATE OR REPLACE FUNCTION calculate_trust_level(p_score INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_level_index INTEGER;
BEGIN
  -- Handle negative scores
  IF p_score < 0 THEN
    p_score := 0;
  END IF;

  -- Find the appropriate level based on score
  SELECT level_index INTO v_level_index
  FROM player_levels
  WHERE p_score >= min_score
    AND (max_score IS NULL OR p_score < max_score)
  ORDER BY level_index DESC
  LIMIT 1;

  -- Return level index, default to 0 if not found
  RETURN COALESCE(v_level_index, 0);
END;
$$;
