-- Fix last_renewed_at to have proper defaults so expires_at can be computed
-- Update existing NULL values to use created_at
UPDATE resources SET last_renewed_at = created_at WHERE last_renewed_at IS NULL;

-- Set default for new rows to now() (same as created_at)
ALTER TABLE resources ALTER COLUMN last_renewed_at SET DEFAULT now();

-- Make last_renewed_at NOT NULL since it should always have a value
ALTER TABLE resources ALTER COLUMN last_renewed_at SET NOT NULL;