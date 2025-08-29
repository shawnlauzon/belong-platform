-- Make trust_scores.last_calculated_at NOT NULL
-- This is safe because:
-- 1. The column has a DEFAULT now() value
-- 2. No existing data has NULL values
-- 3. The domain model expects a non-null Date value

ALTER TABLE trust_scores 
ALTER COLUMN last_calculated_at SET NOT NULL;