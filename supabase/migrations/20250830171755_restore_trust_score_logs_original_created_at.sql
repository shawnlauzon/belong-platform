-- Restore original created_at timestamps for backported trust_score_logs
-- and preserve the backport timestamp in metadata

UPDATE trust_score_logs
SET 
  metadata = jsonb_set(
    metadata, 
    '{backported_at}', 
    to_jsonb(created_at)
  ),
  created_at = (metadata->>'original_created_at')::timestamptz
WHERE metadata->>'backported' = 'true'
  AND metadata->>'original_created_at' IS NOT NULL;