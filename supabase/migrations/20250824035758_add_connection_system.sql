-- Connection system for tracking user connections via QR codes/URLs
-- Each community member gets a persistent connection code for sharing

-- Create connection request status enum
CREATE TYPE connection_request_status AS ENUM (
  'pending',
  'accepted',
  'rejected',
  'expired'
);

-- Table for persistent member connection codes (one per user per community)
CREATE TABLE community_member_codes (
  code TEXT PRIMARY KEY, -- 8-character uppercase alphanumeric code
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Ensure one code per user per community
  CONSTRAINT unique_member_code_user_community UNIQUE (user_id, community_id)
);

-- Table for tracking connection requests (created when codes are scanned/clicked)
CREATE TABLE connection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  initiator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- Code owner
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- Code scanner
  status connection_request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  
  -- Prevent duplicate requests between same users in same community
  CONSTRAINT unique_connection_request UNIQUE (community_id, initiator_id, requester_id)
);

-- Table for established bidirectional connections (completed requests)
CREATE TABLE user_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  connection_request_id UUID NOT NULL REFERENCES connection_requests(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure user_a_id < user_b_id for consistent ordering
  CONSTRAINT ordered_user_ids CHECK (user_a_id < user_b_id),
  
  -- Prevent duplicate connections
  CONSTRAINT unique_user_connection UNIQUE (user_a_id, user_b_id, community_id)
);

-- Indexes for performance
CREATE INDEX idx_community_member_codes_user_community ON community_member_codes(user_id, community_id);
CREATE INDEX idx_community_member_codes_community ON community_member_codes(community_id);
CREATE INDEX idx_connection_requests_initiator ON connection_requests(initiator_id);
CREATE INDEX idx_connection_requests_requester ON connection_requests(requester_id);
CREATE INDEX idx_connection_requests_community ON connection_requests(community_id);
CREATE INDEX idx_connection_requests_status ON connection_requests(status);
CREATE INDEX idx_connection_requests_expires_at ON connection_requests(expires_at);
CREATE INDEX idx_user_connections_user_a ON user_connections(user_a_id);
CREATE INDEX idx_user_connections_user_b ON user_connections(user_b_id);
CREATE INDEX idx_user_connections_community ON user_connections(community_id);

-- RLS Policies

-- Community member codes: users can see their own codes
ALTER TABLE community_member_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own member codes" ON community_member_codes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own member codes" ON community_member_codes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own member codes" ON community_member_codes
  FOR UPDATE USING (auth.uid() = user_id);

-- Connection requests: users can see requests they're involved in
ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their connection requests" ON connection_requests
  FOR SELECT USING (auth.uid() = initiator_id OR auth.uid() = requester_id);

CREATE POLICY "Users can create connection requests" ON connection_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Initiators can update connection requests" ON connection_requests
  FOR UPDATE USING (auth.uid() = initiator_id);

-- User connections: users can see their own connections
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their connections" ON user_connections
  FOR SELECT USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

CREATE POLICY "System can create connections" ON user_connections
  FOR INSERT WITH CHECK (true); -- Will be inserted by backend functions

-- Function to auto-generate connection code when user joins community
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
    -- Generate 8-character uppercase code (excluding ambiguous chars)
    new_code := upper(
      substring(
        encode(gen_random_bytes(6), 'base64')
        from '[A-Z2-9]+'
      )
    );
    
    -- Ensure it's exactly 8 characters by padding or truncating
    new_code := lpad(substring(new_code, 1, 8), 8, '2');
    
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

-- Trigger to auto-generate connection codes
CREATE TRIGGER trigger_generate_member_connection_code
  AFTER INSERT ON community_memberships
  FOR EACH ROW
  EXECUTE FUNCTION generate_member_connection_code();

-- Function to handle connection approval (creates bidirectional connection)
CREATE OR REPLACE FUNCTION create_user_connection(request_id UUID)
RETURNS UUID AS $$
DECLARE
  request_record RECORD;
  connection_id UUID;
  smaller_user_id UUID;
  larger_user_id UUID;
BEGIN
  -- Get the connection request details
  SELECT * INTO request_record 
  FROM connection_requests 
  WHERE id = request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Connection request not found or not pending';
  END IF;
  
  -- Ensure consistent ordering for user_connections
  IF request_record.initiator_id < request_record.requester_id THEN
    smaller_user_id := request_record.initiator_id;
    larger_user_id := request_record.requester_id;
  ELSE
    smaller_user_id := request_record.requester_id;
    larger_user_id := request_record.initiator_id;
  END IF;
  
  -- Create the bidirectional connection
  INSERT INTO user_connections (
    user_a_id,
    user_b_id,
    community_id,
    connection_request_id
  ) VALUES (
    smaller_user_id,
    larger_user_id,
    request_record.community_id,
    request_id
  ) RETURNING id INTO connection_id;
  
  -- Update request status
  UPDATE connection_requests
  SET status = 'accepted', responded_at = NOW()
  WHERE id = request_id;
  
  RETURN connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired connection requests
CREATE OR REPLACE FUNCTION cleanup_expired_connection_requests()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE connection_requests
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;