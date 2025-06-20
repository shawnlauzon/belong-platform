import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteUser } from '../impl/deleteUser';
import { queryKeys } from '../../shared/queryKeys';
import type { User } from '@belongnetwork/types';

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (userId: string) => deleteUser(userId),
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
