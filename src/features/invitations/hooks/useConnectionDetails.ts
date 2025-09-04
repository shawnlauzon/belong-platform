import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useSupabase } from '@/shared/hooks/useSupabase';
import { STANDARD_CACHE_TIME } from '@/config';
import { logger } from '@/shared';
import { fetchInvitationDetails } from '../api';
import type { InvitationDetails } from '../types';
import { connectionQueries } from '../queries';

/**
 * Hook for fetching connection details by member connection code.
 *
 * This hook provides functionality for retrieving connection details
 * including user info, community ID, and connection status without requiring authentication.
 * This is useful for displaying connection information in public contexts via member connection codes.
 *
 * @param memberConnectionCode - The connection code to fetch details for
 * @returns React Query result with connection details and query state
 *
 * @example
 * ```tsx
 * function ConnectionCard({ memberConnectionCode }: { memberConnectionCode: string }) {
 *   const { data: connection, isPending, isError } = useConnectionDetails(memberConnectionCode);
 *
 *   if (isPending) return <div>Loading...</div>;
 *   if (isError) return <div>Error loading connection</div>;
 *   if (!connection) return <div>Connection not found</div>;
 *
 *   return (
 *     <div>
 *       <h3>{connection.user.firstName}</h3>
 *       {connection.user.avatarUrl && (
 *         <img src={connection.user.avatarUrl} alt={`${connection.user.firstName}'s avatar`} />
 *       )}
 *       <p>Community: {connection.communityId}</p>
 *       <p>Status: {connection.isActive ? 'Active' : 'Inactive'}</p>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Using in a connection request component
 * function ConnectionRequest({ memberConnectionCode }: { memberConnectionCode: string }) {
 *   const { data: connection } = useConnectionDetails(memberConnectionCode);
 *
 *   return (
 *     <div className="connection-request">
 *       {connection?.user.avatarUrl && (
 *         <img src={connection.user.avatarUrl} alt="" className="avatar" />
 *       )}
 *       <span>{connection?.user.firstName || 'Unknown'}</span>
 *       <button disabled={!connection?.isActive}>Connect</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @category React Hooks
 */
export function useConnectionDetails(
  memberConnectionCode: string,
  options?: Partial<UseQueryOptions<InvitationDetails | null, Error>>,
): UseQueryResult<InvitationDetails | null, Error> {
  const supabase = useSupabase();

  const query = useQuery<InvitationDetails | null, Error>({
    queryKey: connectionQueries.detail(memberConnectionCode),
    queryFn: () => fetchInvitationDetails(supabase, memberConnectionCode),
    staleTime: STANDARD_CACHE_TIME,
    ...options,
  });

  if (query.error) {
    logger.error('🔗 API: Error fetching connection details', {
      error: query.error,
      memberConnectionCode,
    });
  }

  return query;
}