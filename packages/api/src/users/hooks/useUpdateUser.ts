import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateUser } from '../impl/updateUser';
import { queryKeys } from '../../shared/queryKeys';
import type { User } from '@belongnetwork/types';

type UpdateUserInput = Partial<User> & { id: string };

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: UpdateUserInput) => 
      updateUser(userData),
    onSuccess: (updatedUser) => {
      // Update the individual user cache
      queryClient.setQueryData(queryKeys.users.byId(updatedUser.id), updatedUser);
      // Invalidate the users list query to refetch the updated list
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}
