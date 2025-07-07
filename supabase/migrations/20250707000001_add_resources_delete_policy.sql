-- Add DELETE policy for resources table
CREATE POLICY "Users can delete their own resources"
  ON resources
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);