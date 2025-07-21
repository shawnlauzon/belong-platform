/*
  # Add missing updated_at triggers

  1. Identifies tables with updated_at columns but no triggers
  2. Adds triggers to automatically update the updated_at column on UPDATE operations
  
  Tables receiving triggers:
  - resource_communities
  - resource_responses  
  - resources
  - shoutouts
*/

-- Add updated_at triggers for tables that are missing them

CREATE TRIGGER update_resource_communities_updated_at
  BEFORE UPDATE
  ON resource_communities
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_resource_responses_updated_at
  BEFORE UPDATE
  ON resource_responses
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_resources_updated_at
  BEFORE UPDATE
  ON resources
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_shoutouts_updated_at
  BEFORE UPDATE
  ON shoutouts
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();