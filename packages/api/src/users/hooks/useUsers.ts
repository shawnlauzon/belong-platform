import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createUserService } from '../services/user.service';
import type { UserFilter } from '@belongnetwork/types';

export function useUsers(filter: UserFilter = {}) {
  const supabase = useSupabase();
  const userService = createUserService(supabase);
  
  return useQuery({
    queryKey: ['users', filter],
    queryFn: () => userService.fetchUsers(filter),
    staleTime: 1000 * 60 * 5, // 5 minutes
    placeholderData: keepPreviousData,
  });
}
