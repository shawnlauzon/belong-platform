-- Fix replica identity for notifications table to support realtime subscriptions
-- This is required for Supabase realtime postgres_changes to work properly with filters

ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Verify the change
COMMENT ON TABLE public.notifications IS 'Notifications table with REPLICA IDENTITY FULL for realtime support';