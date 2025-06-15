import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateUser } from '../impl/updateUser';
import type { User } from '@belongnetwork/types';

type UpdateUserInput = {
  id: string;
  updates: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>;
};

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: UpdateUserInput) => 
      updateUser({ id, ...updates }),
    onSuccess: (updatedUser) => {
      // Update the individual user cache
      queryClient.setQueryData(['user', updatedUser.id], updatedUser);
      // Invalidate the users list query to refetch the updated list
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
