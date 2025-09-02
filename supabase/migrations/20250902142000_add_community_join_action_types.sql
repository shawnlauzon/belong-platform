-- Add new specific action types for community joining
-- This replaces the generic 'community_join' with more specific types

-- Step 1: Add new enum values to trust_score_action_type
ALTER TYPE trust_score_action_type ADD VALUE 'community_organizer_join';
ALTER TYPE trust_score_action_type ADD VALUE 'community_member_join';