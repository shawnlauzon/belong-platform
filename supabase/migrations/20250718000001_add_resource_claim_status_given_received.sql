-- Add new statuses to resource_claim_status enum

-- Add 'given' status - indicates the resource has been given/delivered by the owner
ALTER TYPE resource_claim_status ADD VALUE 'given';

-- Add 'received' status - indicates the resource has been received by the claimant
ALTER TYPE resource_claim_status ADD VALUE 'received';