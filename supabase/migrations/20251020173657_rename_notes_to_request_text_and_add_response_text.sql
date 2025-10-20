-- Rename notes column to request_text and add response_text column to resource_claims table
-- This allows us to distinguish between the claimant's request message and the owner's response

-- Rename notes column to request_text
ALTER TABLE resource_claims
RENAME COLUMN notes TO request_text;

-- Add response_text column (nullable)
ALTER TABLE resource_claims
ADD COLUMN response_text TEXT;
