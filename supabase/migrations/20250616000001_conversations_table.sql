/*
  # Create conversations table

  1. New Tables
    - `conversations`
      - `id` (uuid, primary key)
      - `participant_1_id` (uuid, foreign key to profiles)
      - `participant_2_id` (uuid, foreign key to profiles)
      - `last_message_id` (uuid, foreign key to direct_messages, nullable)
      - `last_activity_at` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `conversations` table
    - Add policies for users to only access their own conversations
*/

-- Create conversations table
CREATE TABLE conversations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    participant_1_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    participant_2_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    last_message_id uuid DEFAULT NULL, -- Will reference direct_messages(id) after that table is created
    last_activity_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    
    -- Ensure participant_1_id < participant_2_id to avoid duplicate conversations
    CONSTRAINT conversations_participants_order CHECK (participant_1_id < participant_2_id),
    -- Ensure participants are different
    CONSTRAINT conversations_different_participants CHECK (participant_1_id != participant_2_id),
    -- Unique constraint to prevent duplicate conversations
    UNIQUE(participant_1_id, participant_2_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only see conversations they participate in
CREATE POLICY "Users can view their own conversations" ON conversations
    FOR SELECT USING (
        auth.uid() = participant_1_id OR 
        auth.uid() = participant_2_id
    );

-- Create policy for users to insert conversations they participate in
CREATE POLICY "Users can create conversations they participate in" ON conversations
    FOR INSERT WITH CHECK (
        auth.uid() = participant_1_id OR 
        auth.uid() = participant_2_id
    );

-- Create policy for users to update conversations they participate in
CREATE POLICY "Users can update their own conversations" ON conversations
    FOR UPDATE USING (
        auth.uid() = participant_1_id OR 
        auth.uid() = participant_2_id
    );

-- Create indexes for performance
CREATE INDEX conversations_participant_1_id_idx ON conversations(participant_1_id);
CREATE INDEX conversations_participant_2_id_idx ON conversations(participant_2_id);
CREATE INDEX conversations_last_activity_at_idx ON conversations(last_activity_at DESC);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversations_updated_at_trigger
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_conversations_updated_at();