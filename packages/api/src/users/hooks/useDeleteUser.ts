import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createUserService } from '../services/user.service';
import { queryKeys } from '../../shared/queryKeys';
import type { User } from '@belongnetwork/types';

export function useDeleteUser() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const userService = createUserService(supabase);

  return useMutation<void, Error, string>({
    mutationFn: (userId: string) => userService.deleteUser(userId),
    onSuccess: (_, userId) => {
      // Remove the user from the users list cache
      queryClient.setQueryData<User[]>(queryKeys.users.all, (oldUsers = []) =>
        oldUsers.filter((user) => user.id !== userId)
      );
      // Remove the individual user cache
      queryClient.removeQueries({ queryKey: queryKeys.users.byId(userId) });
    },
  });
}
