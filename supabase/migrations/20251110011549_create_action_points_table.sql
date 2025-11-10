-- Create action_points table to store configurable point values for each action type
-- This is separate from the enum additions to avoid PostgreSQL transaction restrictions

CREATE TABLE action_points (
  action_type action_type PRIMARY KEY,
  points INTEGER NOT NULL
);

-- Populate action_points table with all configured point values
-- Community & Profile
INSERT INTO action_points (action_type, points) VALUES
  ('member.joined', 100),
  ('community.created', 1000),
  ('profile.picture.set', 120),
  ('profile.bio.written', 40),
  ('invitation.accepted', 200);

-- Offers - Claimant
INSERT INTO action_points (action_type, points) VALUES
  ('claim.offer.created', 50),
  ('claim.offer.received', 40),
  ('shoutout.offer.sent.claimant', 80),
  ('shoutout.offer.received.claimant', 20);

-- Offers - Owner
INSERT INTO action_points (action_type, points) VALUES
  ('resource.offer.created', 50),
  ('resource.offer.recurring.created', 50),
  ('resource.image.added', 20),
  ('claim.offer.approved', 150),
  ('claim.offer.rejected', 0),
  ('claim.offer.ignored', -50),
  ('resource.offer.given', 50),
  ('shoutout.offer.sent.owner', 70),
  ('shoutout.offer.received.owner', 200);

-- Events - Claimant
INSERT INTO action_points (action_type, points) VALUES
  ('claim.event.going', 50),
  ('claim.event.attended', 100),
  ('shoutout.event.sent.claimant', 80),
  ('shoutout.event.received.claimant', 40);

-- Events - Owner
INSERT INTO action_points (action_type, points) VALUES
  ('resource.event.created', 100),
  ('resource.event.vote.created', 100),
  ('resource.event.recurring.created', 100),
  ('shoutout.event.sent.owner', 10),
  ('shoutout.event.received.owner', 40);

-- Requests - Claimant/Helper
INSERT INTO action_points (action_type, points) VALUES
  ('claim.request.created', 10),
  ('claim.request.completed', 500),
  ('claim.request.given', 50),
  ('shoutout.request.sent.claimant', 80),
  ('shoutout.request.received.claimant', 40);

-- Requests - Owner/Requestor
INSERT INTO action_points (action_type, points) VALUES
  ('resource.request.created', 0),
  ('claim.request.approved', 100),
  ('claim.request.rejected', 0),
  ('claim.request.ignored', -50),
  ('resource.request.received', 50),
  ('shoutout.request.sent.owner', 40),
  ('shoutout.request.received.owner', 40);

-- General
INSERT INTO action_points (action_type, points) VALUES
  ('claim.event.attendance', 100);

-- Grant permissions
GRANT SELECT ON action_points TO authenticated;
GRANT SELECT ON action_points TO anon;
GRANT ALL ON action_points TO service_role;

COMMENT ON TABLE action_points IS 'Configurable point values for each action type in the trust score system';
COMMENT ON COLUMN action_points.action_type IS 'The type of action performed';
COMMENT ON COLUMN action_points.points IS 'Points awarded (positive) or deducted (negative) for this action';
