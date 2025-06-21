import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createUserService } from '../services/user.service';
import { queryKeys } from '../../shared/queryKeys';

export function useUser(id: string) {
  const supabase = useSupabase();
  const userService = createUserService(supabase);
  
  return useQuery({
    queryKey: queryKeys.users.byId(id),
    queryFn: () => userService.fetchUserById(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
