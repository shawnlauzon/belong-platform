/*
  # Create direct_messages table

  1. New Tables
    - `direct_messages`
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, foreign key to conversations)
      - `from_user_id` (uuid, foreign key to profiles)
      - `to_user_id` (uuid, foreign key to profiles)
      - `content` (text, message content)
      - `read_at` (timestamp, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `direct_messages` table
    - Add policies for users to only access messages they sent or received
*/

-- Create direct_messages table
CREATE TABLE direct_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    from_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    to_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content text NOT NULL,
    read_at timestamp with time zone DEFAULT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    
    -- Ensure sender and receiver are different
    CONSTRAINT direct_messages_different_users CHECK (from_user_id != to_user_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only see messages they sent or received
CREATE POLICY "Users can view their own messages" ON direct_messages
    FOR SELECT USING (
        auth.uid() = from_user_id OR 
        auth.uid() = to_user_id
    );

-- Create policy for users to insert messages they are sending
CREATE POLICY "Users can send messages" ON direct_messages
    FOR INSERT WITH CHECK (
        auth.uid() = from_user_id
    );

-- Create policy for users to update messages they received (for marking as read)
CREATE POLICY "Users can update messages they received" ON direct_messages
    FOR UPDATE USING (
        auth.uid() = to_user_id
    );

-- Create indexes for performance
CREATE INDEX direct_messages_conversation_id_idx ON direct_messages(conversation_id);
CREATE INDEX direct_messages_from_user_id_idx ON direct_messages(from_user_id);
CREATE INDEX direct_messages_to_user_id_idx ON direct_messages(to_user_id);
CREATE INDEX direct_messages_created_at_idx ON direct_messages(created_at DESC);
CREATE INDEX direct_messages_read_at_idx ON direct_messages(read_at);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_direct_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_direct_messages_updated_at_trigger
    BEFORE UPDATE ON direct_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_direct_messages_updated_at();