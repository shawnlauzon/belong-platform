/**
 * Apply deleted_at filtering to a Supabase query
 * @param query - The Supabase query builder
 * @param includeDeleted - Whether to include deleted records (default: false)
 * @returns The query with deletion filter applied
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyDeletedFilter(query: any, includeDeleted = false): any {
  if (!includeDeleted) {
    return query.is('deleted_at', null);
  }
  return query;
}

/**
 * Create a soft delete update object
 * @param userId - The ID of the user performing the deletion
 * @returns Object with deleted_at and deleted_by fields for soft deletion
 */
export function createSoftDeleteUpdate(userId: string): {
  deleted_at: string;
  deleted_by: string;
} {
  return {
    deleted_at: new Date().toISOString(),
    deleted_by: userId,
  };
}
