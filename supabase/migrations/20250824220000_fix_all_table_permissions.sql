-- Fix table permissions that were accidentally revoked by remote_schema migration
-- This migration restores the correct GRANT permissions for all tables
-- 
-- Permission Strategy:
-- - anon: SELECT only (read-only access for public data)
-- - authenticated: SELECT, INSERT, UPDATE, DELETE (full CRUD, controlled by RLS)
-- - service_role: ALL (bypasses RLS, used for admin operations)

-- Communities table
GRANT SELECT ON public.communities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.communities TO authenticated;
GRANT ALL ON public.communities TO service_role;

-- Community memberships table
GRANT SELECT ON public.community_memberships TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_memberships TO authenticated;
GRANT ALL ON public.community_memberships TO service_role;

-- Profiles table
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Resources table
GRANT SELECT ON public.resources TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;

-- Resource communities table
GRANT SELECT ON public.resource_communities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_communities TO authenticated;
GRANT ALL ON public.resource_communities TO service_role;

-- Resource timeslots table
GRANT SELECT ON public.resource_timeslots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_timeslots TO authenticated;
GRANT ALL ON public.resource_timeslots TO service_role;

-- Resource claims table
GRANT SELECT ON public.resource_claims TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_claims TO authenticated;
GRANT ALL ON public.resource_claims TO service_role;

-- Resource responses table
GRANT SELECT ON public.resource_responses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_responses TO authenticated;
GRANT ALL ON public.resource_responses TO service_role;

-- Shoutouts table
GRANT SELECT ON public.shoutouts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shoutouts TO authenticated;
GRANT ALL ON public.shoutouts TO service_role;

-- Trust scores table
GRANT SELECT ON public.trust_scores TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trust_scores TO authenticated;
GRANT ALL ON public.trust_scores TO service_role;

-- Trust score logs table
GRANT SELECT ON public.trust_score_logs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trust_score_logs TO authenticated;
GRANT ALL ON public.trust_score_logs TO service_role;

-- Notifications table
GRANT SELECT ON public.notifications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- Comments table
GRANT SELECT ON public.comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;

-- Messages table (private - no anon access)
-- Messages are private between users, so no anonymous access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

-- Conversations table (private - no anon access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;

-- Conversation participants table (private - no anon access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_participants TO authenticated;
GRANT ALL ON public.conversation_participants TO service_role;

-- Message status table (private - no anon access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_status TO authenticated;
GRANT ALL ON public.message_status TO service_role;

-- Message reports table (private - no anon access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_reports TO authenticated;
GRANT ALL ON public.message_reports TO service_role;

-- Blocked users table (private - no anon access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocked_users TO authenticated;
GRANT ALL ON public.blocked_users TO service_role;

-- Connection system tables (only grant if they exist)
-- These tables are created in the 20250824035758_add_connection_system migration
-- We check if they exist before granting permissions to avoid errors

DO $$ 
BEGIN
    -- Community member codes table
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'community_member_codes') THEN
        EXECUTE 'GRANT SELECT ON public.community_member_codes TO anon';
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_member_codes TO authenticated';
        EXECUTE 'GRANT ALL ON public.community_member_codes TO service_role';
    END IF;

    -- Connection requests table
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'connection_requests') THEN
        EXECUTE 'GRANT SELECT ON public.connection_requests TO anon';
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.connection_requests TO authenticated';
        EXECUTE 'GRANT ALL ON public.connection_requests TO service_role';
    END IF;

    -- User connections table
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_connections') THEN
        EXECUTE 'GRANT SELECT ON public.user_connections TO anon';
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_connections TO authenticated';
        EXECUTE 'GRANT ALL ON public.user_connections TO service_role';
    END IF;
END $$;