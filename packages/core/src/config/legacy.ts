/**
 * Legacy compatibility function for getBelongClient
 * @deprecated This function is deprecated. Use the service pattern with dependency injection instead.
 * 
 * Legacy pattern:
 * ```ts
 * const { supabase, logger } = getBelongClient();
 * ```
 * 
 * New service pattern:
 * ```ts
 * const supabase = useSupabase();
 * const service = createServiceName(supabase);
 * ```
 */
export function getBelongClient() {
  throw new Error(
    'getBelongClient() is deprecated. Please use the service pattern with dependency injection instead. ' +
    'See the service files for examples of the new pattern.'
  );
}