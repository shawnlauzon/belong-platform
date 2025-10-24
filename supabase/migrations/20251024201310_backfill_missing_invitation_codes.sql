-- Backfill Missing Invitation Codes
-- Ensures every community membership has a corresponding invitation code

DO $$
DECLARE
  membership_record RECORD;
  new_code TEXT;
  max_attempts INTEGER := 10;
  attempt_count INTEGER;
  code_exists BOOLEAN;
  total_backfilled INTEGER := 0;
BEGIN
  -- Loop through all community memberships that don't have active invitation codes
  FOR membership_record IN
    SELECT DISTINCT cm.user_id, cm.community_id
    FROM community_memberships cm
    LEFT JOIN invitation_codes ic
      ON cm.user_id = ic.user_id
      AND cm.community_id = ic.community_id
      AND ic.is_active = true
    WHERE ic.code IS NULL
  LOOP
    attempt_count := 0;
    code_exists := true;

    -- Generate unique code with retry logic
    WHILE code_exists AND attempt_count < max_attempts LOOP
      -- Generate 8-character uppercase code matching the existing implementation
      -- Use same character set: '23456789ABCDEFGHJKLMNPQRSTUVWXYZ' (excludes 0,1,I,O)
      new_code := '';
      FOR i IN 1..8 LOOP
        new_code := new_code || substring('23456789ABCDEFGHJKLMNPQRSTUVWXYZ',
          floor(random() * 32)::integer + 1, 1);
      END LOOP;

      -- Check if code already exists
      SELECT EXISTS(
        SELECT 1 FROM invitation_codes WHERE code = new_code
      ) INTO code_exists;

      IF NOT code_exists THEN
        -- Insert the new invitation code
        INSERT INTO invitation_codes (code, user_id, community_id, is_active)
        VALUES (new_code, membership_record.user_id, membership_record.community_id, true);

        total_backfilled := total_backfilled + 1;

        RAISE LOG 'Generated invitation code % for user % in community %',
          new_code, membership_record.user_id, membership_record.community_id;
      ELSE
        attempt_count := attempt_count + 1;

        IF attempt_count >= max_attempts THEN
          RAISE EXCEPTION 'Failed to generate unique invitation code after % attempts for user % in community %',
            max_attempts, membership_record.user_id, membership_record.community_id;
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Backfilled % invitation codes', total_backfilled;
END $$;
