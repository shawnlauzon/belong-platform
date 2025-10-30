-- Part 2: Migrate data and update functions from 'scheduled' to 'active'

-- Step 1: Convert column to text to allow updating values
ALTER TABLE resources ALTER COLUMN status TYPE TEXT;

-- Step 2: Update all existing 'scheduled' values to 'active'
UPDATE resources SET status = 'active' WHERE status = 'scheduled';

-- Step 3: Convert back to enum
ALTER TABLE resources ALTER COLUMN status TYPE resource_status USING status::resource_status;

-- Step 4: Update the default value
ALTER TABLE resources ALTER COLUMN status SET DEFAULT 'active'::resource_status;

-- Step 5: Update notify_on_resource_community_insert trigger to check for 'active' status
CREATE OR REPLACE FUNCTION notify_on_resource_community_insert()
RETURNS TRIGGER AS $$
DECLARE
  resource_record RECORD;
  member_record RECORD;
  action_val action_type;
BEGIN
  -- Get resource details
  SELECT * INTO resource_record
  FROM resources
  WHERE id = NEW.resource_id;

  -- Skip if resource doesn't exist or is not active
  IF resource_record IS NULL OR resource_record.status != 'active' THEN
    RETURN NEW;
  END IF;

  -- Determine action type
  IF resource_record.type = 'event' THEN
    action_val := 'event.created';
  ELSE
    action_val := 'resource.created';
  END IF;

  -- Notify all community members about new resource (only if in_app enabled)
  FOR member_record IN
    SELECT user_id
    FROM community_memberships
    WHERE community_id = NEW.community_id
      AND user_id != resource_record.owner_id
  LOOP
    IF should_create_in_app_notification(member_record.user_id, action_val) THEN
      PERFORM notify_new_resource(
        member_record.user_id,
        resource_record.owner_id,
        NEW.resource_id,
        NEW.community_id,
        resource_record.type,
        resource_record.title
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
