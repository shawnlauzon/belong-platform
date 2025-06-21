import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createUserService } from '../services/user.service';
import { queryKeys } from '../../shared/queryKeys';
import type { User } from '@belongnetwork/types';

type UpdateUserInput = Partial<User> & { id: string };

export function useUpdateUser() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const userService = createUserService(supabase);

  return useMutation({
    mutationFn: (userData: UpdateUserInput) => 
      userService.updateUser(userData),
    onSuccess: (updatedUser) => {
      // Update the individual user cache
      queryClient.setQueryData(queryKeys.users.byId(updatedUser.id), updatedUser);
      // Invalidate the users list query to refetch the updated list
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}
