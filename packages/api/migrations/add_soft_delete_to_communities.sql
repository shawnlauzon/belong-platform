-- Add soft delete fields to communities table
ALTER TABLE communities 
ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN deleted_by UUID REFERENCES profiles(id);

-- Create index for performance on active communities queries
CREATE INDEX idx_communities_is_active ON communities(is_active) WHERE is_active = true;

-- Create index for deleted communities queries
CREATE INDEX idx_communities_deleted_at ON communities(deleted_at) WHERE deleted_at IS NOT NULL;

-- Update existing communities to be active
UPDATE communities SET is_active = true WHERE is_active IS NULL;