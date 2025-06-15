import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchUsers } from '../impl/fetchUsers';
import type { UserFilter } from '@belongnetwork/types';

export function useUsers(filter: UserFilter = {}) {
  return useQuery({
    queryKey: ['users', filter],
    queryFn: () => fetchUsers(filter),
    staleTime: 1000 * 60 * 5, // 5 minutes
    placeholderData: keepPreviousData,
  });
}
