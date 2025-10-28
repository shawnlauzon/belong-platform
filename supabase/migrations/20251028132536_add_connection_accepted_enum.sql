-- Add 'connection.accepted' to action_type enum
-- This must be in a separate migration due to PostgreSQL constraint:
-- newly added enum values cannot be used in the same transaction

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'connection.accepted'
    AND enumtypid = 'action_type'::regtype
  ) THEN
    ALTER TYPE action_type ADD VALUE 'connection.accepted';
  END IF;
END $$;
