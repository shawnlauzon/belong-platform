/*
  # Auto-Create Timeslot Claims Trigger
  
  1. Problem
    - When timeslots are created, claims need to be automatically generated
    - Claims should have appropriate status based on approval requirements and ownership
    
  2. Solution
    - Create a trigger that fires after timeslot insertion
    - Automatically create a claim for the user creating the timeslot
    - Set status to "approved" if no approval required or user is resource owner
    - Set status to "pending" if approval required and user is not resource owner
    
  3. Benefits
    - Streamlines the timeslot creation process
    - Ensures consistent claim creation logic
    - Reduces application complexity by handling this at the database level
*/

-- Create function to auto-create claims for new timeslots
CREATE OR REPLACE FUNCTION auto_create_timeslot_claim()
RETURNS TRIGGER AS $$
DECLARE
  requires_approval boolean;
  resource_owner_id uuid;
  current_user_id uuid;
  claim_status resource_claim_status;
BEGIN
  -- Log the attempt for debugging
  RAISE LOG 'Auto-creating claim for timeslot % on resource %', NEW.id, NEW.resource_id;
  
  -- Get current authenticated user
  current_user_id := auth.uid();
  
  -- Validate we have an authenticated user
  IF current_user_id IS NULL THEN
    RAISE WARNING 'No authenticated user found when creating timeslot %', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Get resource details
  SELECT r.requires_approval, r.owner_id 
  INTO requires_approval, resource_owner_id
  FROM resources r
  WHERE r.id = NEW.resource_id;
  
  -- Validate resource exists
  IF NOT FOUND THEN
    RAISE WARNING 'Resource % not found when creating timeslot %', NEW.resource_id, NEW.id;
    RETURN NEW;
  END IF;
  
  -- Determine status based on approval requirement and ownership
  claim_status := CASE 
    WHEN NOT requires_approval OR current_user_id = resource_owner_id 
    THEN 'approved'::resource_claim_status
    ELSE 'pending'::resource_claim_status
  END;
  
  -- Log the status decision
  RAISE LOG 'Setting claim status to % for timeslot % (requires_approval: %, is_owner: %)', 
    claim_status, NEW.id, requires_approval, (current_user_id = resource_owner_id);
  
  -- Create the claim with NULL claimant_id (auto-assigns to current auth user)
  INSERT INTO resource_claims (
    timeslot_id,
    resource_id, 
    claimant_id,
    status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.resource_id,
    NULL, -- Auto-assigns to current auth user
    claim_status,
    now(),
    now()
  )
  ON CONFLICT (timeslot_id, claimant_id) DO NOTHING;
  
  RAISE LOG 'Successfully created claim for timeslot % with status %', NEW.id, claim_status;
  RETURN NEW;
  
EXCEPTION
  WHEN unique_violation THEN
    RAISE LOG 'Claim already exists for timeslot % and user %', NEW.id, current_user_id;
    RETURN NEW;
  WHEN foreign_key_violation THEN
    RAISE WARNING 'Foreign key violation creating claim for timeslot %: %', NEW.id, SQLERRM;
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'Unexpected error creating claim for timeslot %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment to document the function
COMMENT ON FUNCTION auto_create_timeslot_claim() IS 'Automatically creates a claim when a timeslot is created. Sets status to approved if no approval required or user is resource owner, otherwise pending.';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_create_timeslot_claim_trigger ON resource_timeslots;

-- Create trigger on timeslots table
CREATE TRIGGER auto_create_timeslot_claim_trigger
  AFTER INSERT ON resource_timeslots
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_timeslot_claim();

-- Add comment to document the trigger
COMMENT ON TRIGGER auto_create_timeslot_claim_trigger ON resource_timeslots IS 'Automatically creates a claim for the user when they create a timeslot';