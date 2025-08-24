-- Fix connection code generation bug: use correct character count (32 instead of 30)
-- The character set '23456789ABCDEFGHJKLMNPQRSTUVWXYZ' has 32 characters
-- Previous implementation only used first 30 characters, missing 'Y' and 'Z'

-- Fix the generate_member_connection_code function
CREATE OR REPLACE FUNCTION generate_member_connection_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  max_attempts INTEGER := 10;
  attempt_count INTEGER := 0;
BEGIN
  -- Only for INSERT operations on community_memberships
  IF TG_OP != 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- Generate unique code with retry logic
  LOOP
    -- Generate 8-character uppercase code matching JavaScript implementation
    -- Use same character set: '23456789ABCDEFGHJKLMNPQRSTUVWXYZ' (excludes 0,1,I,O)
    new_code := '';
    FOR i IN 1..8 LOOP
      new_code := new_code || substring('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 
        floor(random() * 32)::integer + 1, 1);  -- Fixed: changed from 30 to 32
    END LOOP;
    
    -- Try to insert the code
    BEGIN
      INSERT INTO community_member_codes (code, user_id, community_id)
      VALUES (new_code, NEW.user_id, NEW.community_id);
      EXIT; -- Success, exit loop
    EXCEPTION WHEN unique_violation THEN
      -- Code already exists, try again
      attempt_count := attempt_count + 1;
      IF attempt_count >= max_attempts THEN
        RAISE EXCEPTION 'Failed to generate unique connection code after % attempts', max_attempts;
      END IF;
    END;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix the regenerate_member_connection_code function
CREATE OR REPLACE FUNCTION regenerate_member_connection_code(p_user_id UUID, p_community_id UUID)
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  max_attempts INTEGER := 10;
  attempt_count INTEGER := 0;
  old_code_record RECORD;
BEGIN
  -- First, deactivate existing code
  UPDATE community_member_codes
  SET is_active = false
  WHERE user_id = p_user_id AND community_id = p_community_id AND is_active = true
  RETURNING code INTO old_code_record;
  
  -- Generate new unique code with retry logic
  LOOP
    -- Generate 8-character uppercase code matching JavaScript implementation
    -- Use same character set: '23456789ABCDEFGHJKLMNPQRSTUVWXYZ' (excludes 0,1,I,O)
    new_code := '';
    FOR i IN 1..8 LOOP
      new_code := new_code || substring('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 
        floor(random() * 32)::integer + 1, 1);  -- Fixed: changed from 30 to 32
    END LOOP;
    
    -- Try to insert the new code
    BEGIN
      INSERT INTO community_member_codes (code, user_id, community_id, is_active)
      VALUES (new_code, p_user_id, p_community_id, true);
      EXIT; -- Success, exit loop
    EXCEPTION WHEN unique_violation THEN
      -- Code already exists, try again
      attempt_count := attempt_count + 1;
      IF attempt_count >= max_attempts THEN
        RAISE EXCEPTION 'Failed to generate unique connection code after % attempts', max_attempts;
      END IF;
    END;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;