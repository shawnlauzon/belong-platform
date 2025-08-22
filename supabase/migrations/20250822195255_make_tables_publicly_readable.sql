-- Drop existing SELECT policies for resources
DROP POLICY IF EXISTS "community_members_can_view_resources" ON "public"."resources";
DROP POLICY IF EXISTS "owners_can_select_their_resources" ON "public"."resources";

-- Drop existing SELECT policies for shoutouts
DROP POLICY IF EXISTS "Allow public read access to shoutouts" ON "public"."shoutouts";
DROP POLICY IF EXISTS "Community members can view shoutouts" ON "public"."shoutouts";

-- Drop existing SELECT policies for trust_scores
DROP POLICY IF EXISTS "Trust scores are publicly readable" ON "public"."trust_scores";

-- Drop existing SELECT policies for resource_timeslots
DROP POLICY IF EXISTS "community_members_can_view_resource_timeslots" ON "public"."resource_timeslots";

-- Drop existing SELECT policies for resource_communities
DROP POLICY IF EXISTS "Users can view resource-community associations for their commun" ON "public"."resource_communities";

-- Drop existing SELECT policies for comments  
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."comments";
DROP POLICY IF EXISTS "Comments are viewable by community members" ON "public"."comments";

-- Create new public SELECT policies
CREATE POLICY "Public read access for resources" ON "public"."resources"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access for shoutouts" ON "public"."shoutouts"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access for trust_scores" ON "public"."trust_scores"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access for resource_timeslots" ON "public"."resource_timeslots"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access for resource_communities" ON "public"."resource_communities"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access for comments" ON "public"."comments"
  AS PERMISSIVE FOR SELECT
  TO public
  USING (true);