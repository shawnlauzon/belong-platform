-- Merged notification system migration
-- Combines: create_notification_system, fix_resource_notification_trigger, enable_notifications_realtime

-- Drop old unused notifications table
DROP TABLE IF EXISTS notifications CASCADE;

-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('comment', 'comment_reply', 'claim', 'message', 'new_resource')),
  
  -- Polymorphic references (only one will be set based on type)
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  claim_id UUID REFERENCES resource_claims(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  
  -- Actor who triggered the notification
  actor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Grouping support for "John and 3 others commented"
  group_key TEXT,
  actor_count INTEGER DEFAULT 1,
  
  -- Metadata for rendering notifications
  title TEXT NOT NULL,
  body TEXT,
  image_url TEXT,
  action_url TEXT, -- Deep link to content
  metadata JSONB DEFAULT '{}',
  
  -- Status tracking
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notification_preferences table
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Per-type preferences
  comments_on_resources BOOLEAN DEFAULT TRUE,
  comment_replies BOOLEAN DEFAULT TRUE,
  resource_claims BOOLEAN DEFAULT TRUE,
  new_messages BOOLEAN DEFAULT TRUE,
  community_resources BOOLEAN DEFAULT TRUE,
  
  -- Global settings (for future email/push)
  email_enabled BOOLEAN DEFAULT FALSE,
  push_enabled BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notification_counts table (for performance)
CREATE TABLE notification_counts (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Cached counts by category
  unread_total INTEGER DEFAULT 0,
  unread_comments INTEGER DEFAULT 0,
  unread_claims INTEGER DEFAULT 0,
  unread_messages INTEGER DEFAULT 0,
  unread_resources INTEGER DEFAULT 0,
  
  -- For "new" indicators
  last_checked_at TIMESTAMPTZ DEFAULT NOW(),
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create seen_resources table (track viewed community resources)
CREATE TABLE seen_resources (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  seen_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, resource_id)
);

-- Indexes for performance
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_group ON notifications(user_id, group_key, is_read);
CREATE INDEX idx_notifications_type ON notifications(user_id, type, created_at DESC);
CREATE INDEX idx_notifications_cleanup ON notifications(created_at) WHERE is_read = TRUE;

-- Indexes for notification_counts
CREATE INDEX idx_notification_counts_user ON notification_counts(user_id);

-- Indexes for seen_resources
CREATE INDEX idx_seen_resources_user ON seen_resources(user_id, seen_at DESC);
CREATE INDEX idx_seen_resources_resource ON seen_resources(resource_id, seen_at DESC);

-- Updated at triggers
CREATE TRIGGER handle_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_notification_counts_updated_at
    BEFORE UPDATE ON notification_counts
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- RLS Policies

-- notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
ON notifications FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Service role can create notifications"
ON notifications FOR INSERT
TO service_role
WITH CHECK (true);

-- notification_preferences table
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
ON notification_preferences FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences"
ON notification_preferences FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own preferences"
ON notification_preferences FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- notification_counts table
ALTER TABLE notification_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own counts"
ON notification_counts FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Service role can manage notification counts"
ON notification_counts FOR ALL
TO service_role
WITH CHECK (true);

-- seen_resources table
ALTER TABLE seen_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own seen resources"
ON seen_resources FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own seen resources"
ON seen_resources FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own seen resources"
ON seen_resources FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Helper Functions

-- Check if user has notification preferences
CREATE OR REPLACE FUNCTION should_send_notification(p_user_id UUID, p_type TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  preferences notification_preferences%ROWTYPE;
BEGIN
  SELECT * INTO preferences
  FROM notification_preferences
  WHERE user_id = p_user_id;
  
  -- If no preferences exist, default to true for all types
  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;
  
  -- Check specific preference based on type
  CASE p_type
    WHEN 'comment' THEN
      RETURN preferences.comments_on_resources;
    WHEN 'comment_reply' THEN
      RETURN preferences.comment_replies;
    WHEN 'claim' THEN
      RETURN preferences.resource_claims;
    WHEN 'message' THEN
      RETURN preferences.new_messages;
    WHEN 'new_resource' THEN
      RETURN preferences.community_resources;
    ELSE
      RETURN TRUE; -- Default to true for unknown types
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update notification counts
CREATE OR REPLACE FUNCTION update_notification_counts(
  p_user_id UUID,
  p_type TEXT,
  p_delta INTEGER
) RETURNS VOID AS $$
BEGIN
  -- Upsert notification counts record
  INSERT INTO notification_counts (user_id, unread_total, unread_comments, unread_claims, unread_messages, unread_resources)
  VALUES (p_user_id, 0, 0, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Update counts based on type
  CASE p_type
    WHEN 'comment' THEN
      UPDATE notification_counts
      SET unread_comments = GREATEST(0, unread_comments + p_delta),
          unread_total = GREATEST(0, unread_total + p_delta)
      WHERE user_id = p_user_id;
    WHEN 'comment_reply' THEN
      UPDATE notification_counts
      SET unread_comments = GREATEST(0, unread_comments + p_delta),
          unread_total = GREATEST(0, unread_total + p_delta)
      WHERE user_id = p_user_id;
    WHEN 'claim' THEN
      UPDATE notification_counts
      SET unread_claims = GREATEST(0, unread_claims + p_delta),
          unread_total = GREATEST(0, unread_total + p_delta)
      WHERE user_id = p_user_id;
    WHEN 'message' THEN
      UPDATE notification_counts
      SET unread_messages = GREATEST(0, unread_messages + p_delta),
          unread_total = GREATEST(0, unread_total + p_delta)
      WHERE user_id = p_user_id;
    WHEN 'new_resource' THEN
      UPDATE notification_counts
      SET unread_resources = GREATEST(0, unread_resources + p_delta),
          unread_total = GREATEST(0, unread_total + p_delta)
      WHERE user_id = p_user_id;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Core notification creation function
CREATE OR REPLACE FUNCTION create_or_update_notification(
  p_user_id UUID,
  p_type TEXT,
  p_actor_id UUID,
  p_group_key TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_comment_id UUID DEFAULT NULL,
  p_claim_id UUID DEFAULT NULL,
  p_message_id UUID DEFAULT NULL,
  p_conversation_id UUID DEFAULT NULL,
  p_community_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS notifications AS $$
DECLARE
  existing_notification notifications%ROWTYPE;
  new_notification notifications%ROWTYPE;
BEGIN
  -- Don't send notification to self
  IF p_user_id = p_actor_id THEN
    RETURN NULL;
  END IF;
  
  -- Check if user wants this type of notification
  IF NOT should_send_notification(p_user_id, p_type) THEN
    RETURN NULL;
  END IF;
  
  -- Check for existing notification in the same group
  IF p_group_key IS NOT NULL THEN
    SELECT * INTO existing_notification
    FROM notifications
    WHERE user_id = p_user_id
      AND group_key = p_group_key
      AND is_read = FALSE;
    
    -- If found, update actor count
    IF FOUND THEN
      UPDATE notifications
      SET actor_count = actor_count + 1,
          updated_at = NOW()
      WHERE id = existing_notification.id
      RETURNING * INTO new_notification;
      
      RETURN new_notification;
    END IF;
  END IF;
  
  -- Create new notification
  INSERT INTO notifications (
    user_id, type, actor_id, group_key, title, body, action_url,
    resource_id, comment_id, claim_id, message_id, conversation_id, community_id,
    metadata
  ) VALUES (
    p_user_id, p_type, p_actor_id, p_group_key, p_title, p_body, p_action_url,
    p_resource_id, p_comment_id, p_claim_id, p_message_id, p_conversation_id, p_community_id,
    p_metadata
  ) RETURNING * INTO new_notification;
  
  -- Update notification counts
  PERFORM update_notification_counts(p_user_id, p_type, 1);
  
  RETURN new_notification;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger Functions

-- Comment notifications
CREATE OR REPLACE FUNCTION notify_on_comment() RETURNS TRIGGER AS $$
DECLARE
  comment_author_name TEXT;
  resource_owner_id UUID;
  resource_title TEXT;
  parent_comment comments%ROWTYPE;
  parent_author_id UUID;
  parent_author_name TEXT;
BEGIN
  -- Get comment author name with fallback
  SELECT COALESCE(full_name, first_name || ' ' || last_name, 'Someone') INTO comment_author_name
  FROM public_profiles
  WHERE id = NEW.author_id;
  
  -- Fallback if no profile found
  IF comment_author_name IS NULL THEN
    comment_author_name := 'Someone';
  END IF;
  
  -- Handle resource comments
  IF NEW.resource_id IS NOT NULL THEN
    -- Get resource owner and title
    SELECT owner_id, title INTO resource_owner_id, resource_title
    FROM resources
    WHERE id = NEW.resource_id;
    
    -- Notify resource owner
    IF resource_owner_id IS NOT NULL THEN
      PERFORM create_or_update_notification(
        resource_owner_id,
        'comment',
        NEW.author_id,
        'resource_comment:' || NEW.resource_id::text,
        comment_author_name || ' commented on your ' || LOWER(resource_title),
        NEW.content,
        '/resources/' || NEW.resource_id::text,
        NEW.resource_id,
        NEW.id,
        NULL, NULL, NULL, NULL,
        jsonb_build_object('resource_title', resource_title)
      );
    END IF;
  END IF;
  
  -- Handle comment replies
  IF NEW.parent_id IS NOT NULL THEN
    -- Get parent comment and its author
    SELECT * INTO parent_comment
    FROM comments
    WHERE id = NEW.parent_id;
    
    IF FOUND THEN
      SELECT COALESCE(full_name, first_name || ' ' || last_name, 'Someone') INTO parent_author_name
      FROM public_profiles
      WHERE id = parent_comment.author_id;
      
      -- Fallback if no profile found
      IF parent_author_name IS NULL THEN
        parent_author_name := 'Someone';
      END IF;
      
      -- Notify parent comment author
      PERFORM create_or_update_notification(
        parent_comment.author_id,
        'comment_reply',
        NEW.author_id,
        'comment_reply:' || NEW.parent_id::text,
        comment_author_name || ' replied to your comment',
        NEW.content,
        '/comments/' || NEW.parent_id::text,
        NEW.resource_id,
        NEW.id,
        NULL, NULL, NULL, NULL,
        jsonb_build_object('parent_comment', parent_comment.content)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Resource claim notifications
CREATE OR REPLACE FUNCTION notify_on_claim() RETURNS TRIGGER AS $$
DECLARE
  claimant_name TEXT;
  resource_owner_id UUID;
  resource_title TEXT;
BEGIN
  -- Get claimant name with fallback
  SELECT COALESCE(full_name, first_name || ' ' || last_name, 'Someone') INTO claimant_name
  FROM public_profiles
  WHERE id = NEW.claimant_id;
  
  -- Fallback if no profile found
  IF claimant_name IS NULL THEN
    claimant_name := 'Someone';
  END IF;
  
  -- Get resource owner and title
  SELECT owner_id, title INTO resource_owner_id, resource_title
  FROM resources
  WHERE id = NEW.resource_id;
  
  -- Notify resource owner
  IF resource_owner_id IS NOT NULL THEN
    PERFORM create_or_update_notification(
      resource_owner_id,
      'claim',
      NEW.claimant_id,
      'resource_claim:' || NEW.resource_id::text,
      claimant_name || ' claimed your ' || LOWER(resource_title),
      NEW.notes,
      '/resources/' || NEW.resource_id::text,
      NEW.resource_id,
      NULL,
      NEW.id,
      NULL, NULL, NULL,
      jsonb_build_object('resource_title', resource_title, 'claim_status', NEW.status)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function that works with resource_communities context (fixed version)
CREATE OR REPLACE FUNCTION notify_on_resource_community_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  resource_record resources%ROWTYPE;
  resource_author_name TEXT;
  community_name TEXT;
  community_member RECORD;
BEGIN
  -- Get the resource details
  SELECT * INTO resource_record
  FROM resources
  WHERE id = NEW.resource_id;
  
  -- Get the community name
  SELECT name INTO community_name
  FROM communities
  WHERE id = NEW.community_id;
  
  -- Get resource author name with fallback
  SELECT COALESCE(full_name, first_name || ' ' || last_name, 'Someone') INTO resource_author_name
  FROM public_profiles
  WHERE id = resource_record.owner_id;
  
  -- Fallback if no profile found
  IF resource_author_name IS NULL THEN
    resource_author_name := 'Someone';
  END IF;
  
  -- Notify all members of this specific community
  FOR community_member IN
    SELECT DISTINCT cm.user_id
    FROM community_memberships cm
    WHERE cm.community_id = NEW.community_id
      AND cm.user_id != resource_record.owner_id -- Don't notify the resource owner
  LOOP
    PERFORM create_or_update_notification(
      community_member.user_id,
      'new_resource',
      resource_record.owner_id,
      'new_resource:' || community_name,
      'New ' || LOWER(resource_record.category::text) || ' in ' || community_name,
      resource_record.title,
      '/resources/' || resource_record.id::text,
      resource_record.id,
      NULL, NULL, NULL, NULL, NEW.community_id,
      jsonb_build_object('resource_title', resource_record.title, 'community_name', community_name, 'resource_category', resource_record.category)
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Update counts when notifications are marked as read
CREATE OR REPLACE FUNCTION update_counts_on_read() RETURNS TRIGGER AS $$
BEGIN
  -- Only update counts if the notification was marked as read
  IF OLD.is_read = FALSE AND NEW.is_read = TRUE THEN
    PERFORM update_notification_counts(OLD.user_id, OLD.type, -1);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER comment_notification_trigger
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION notify_on_comment();

CREATE TRIGGER claim_notification_trigger
AFTER INSERT ON resource_claims
FOR EACH ROW
EXECUTE FUNCTION notify_on_claim();

-- Create the trigger on resource_communities table (fixed version)
CREATE TRIGGER resource_community_notification_trigger
  AFTER INSERT ON resource_communities
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_resource_community_insert();

-- Update counts when notifications are read
CREATE TRIGGER notification_read_trigger
AFTER UPDATE ON notifications
FOR EACH ROW
EXECUTE FUNCTION update_counts_on_read();

-- Enable realtime subscriptions for notification tables
-- This allows postgres_changes subscriptions to work for real-time notifications

-- Add notification tables to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE notification_counts; 
ALTER PUBLICATION supabase_realtime ADD TABLE notification_preferences;