import { PostgrestQueryBuilder } from '@supabase/postgrest-js';

/**
 * Apply deleted_at filtering to a Supabase query
 * @param query - The Supabase query builder
 * @param includeDeleted - Whether to include deleted records (default: false)
 * @returns The query with deletion filter applied
 */
export function applyDeletedFilter<T>(
  query: PostgrestQueryBuilder<unknown, T, unknown>,
  includeDeleted = false
): PostgrestQueryBuilder<unknown, T, unknown> {
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