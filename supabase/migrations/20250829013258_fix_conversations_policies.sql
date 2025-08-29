-- Fix RLS policies on conversations table

-- Drop the duplicate policy (public role version)
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;

-- Drop and recreate the create policy with correct role (authenticated instead of public)
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations" 
    ON conversations 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (conversation_type = 'direct');