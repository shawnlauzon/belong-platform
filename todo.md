# RLS Policy Issue Investigation Results

## Problem Summary
The `deleteComment` function fails with "new row violates row-level security policy for table 'comments'" even when the authenticated user owns the comment.

## Investigation Results

### Test Case Used
- User ID: `05909f43-2695-4e11-afd2-c54eea70617f`
- Comment ID: `8932cb40-197a-4d92-96bf-be36de9f2f83`
- User email: `test_int_torey.bins98@example.com`

### Key Findings

1. **Authentication is Working**:
   - ✅ User successfully signs in
   - ✅ `auth.getUser()` returns correct user ID
   - ✅ User ID matches comment's `author_id`

2. **Data Exists**:
   - ✅ Service client can see all data (bypasses RLS)
   - ✅ Comment exists with correct author_id
   - ✅ User exists and can authenticate

3. **RLS Policy Issue**:
   - ❌ UPDATE operation fails despite user owning the comment
   - ❌ Error: "new row violates row-level security policy for table 'comments'"
   - ❌ Current RLS policy: `(auth.uid() = author_id)` should allow this but doesn't work

### Current RLS Policies
```sql
-- UPDATE policy that is failing
Users can update their own comments
CMD: UPDATE
QUAL: (auth.uid() = author_id)
WITH_CHECK: null
```

### Complex PostgREST Query Observed
The actual SQL being executed is much more complex than a simple UPDATE, involving CTEs and `json_to_record`:
```sql
WITH pgrst_source AS (
  UPDATE "public"."comments" 
  SET "is_deleted" = "pgrst_body"."is_deleted" 
  FROM (SELECT $1 AS json_data) pgrst_payload, 
  LATERAL (SELECT "is_deleted" FROM json_to_record(pgrst_payload.json_data) AS _("is_deleted" boolean)) pgrst_body  
  WHERE "public"."comments"."id" = $2 
  RETURNING 1
) 
SELECT '' AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total...
```

## Root Cause Theory
The RLS policy `(auth.uid() = author_id)` is not working correctly, possibly due to:
1. Issues with `auth.uid()` evaluation in the complex PostgREST query context
2. RLS policy evaluation timing issues with the CTE/JSON parsing approach
3. Missing or incorrect RLS policy configuration

## Next Steps
1. Check if other UPDATE operations work (like `updateComment`)
2. Consider using service client for delete operations
3. Investigate if RLS policy needs to be modified or recreated
4. Check if there are any database triggers or constraints interfering

## Evidence Files
- Test file: `tests/integration/comments/comments-rls-debug.test.ts`
- Affected function: `src/features/comments/api/deleteComment.ts`