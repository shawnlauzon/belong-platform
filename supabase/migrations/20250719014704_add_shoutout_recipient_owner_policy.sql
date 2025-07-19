-- Policy to ensure shoutout recipient matches resource owner for inserts
CREATE POLICY "shoutout_to_user_must_match_resource_owner_insert"
ON shoutouts
FOR INSERT
TO authenticated
WITH CHECK (
  to_user_id = (
    SELECT owner_id 
    FROM resources 
    WHERE id = resource_id
  )
);

-- Policy to ensure shoutout recipient matches resource owner for updates
CREATE POLICY "shoutout_to_user_must_match_resource_owner_update"
ON shoutouts
FOR UPDATE
TO authenticated
USING (
  to_user_id = (
    SELECT owner_id 
    FROM resources 
    WHERE id = resource_id
  )
)
WITH CHECK (
  to_user_id = (
    SELECT owner_id 
    FROM resources 
    WHERE id = resource_id
  )
);