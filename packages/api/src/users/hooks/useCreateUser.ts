import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createUserService } from '../services/user.service';
import { queryKeys } from '../../shared/queryKeys';
import type { User, UserData } from '@belongnetwork/types';
import type { User as SupabaseUser } from '@supabase/supabase-js';

type CreateUserInput = {
  user: SupabaseUser | string; // Can be Supabase user object or user ID
  userData: Omit<UserData, 'id' | 'email'>;
};

export function useCreateUser() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const userService = createUserService(supabase);

  return useMutation<User, Error, CreateUserInput>({
    mutationFn: async ({ user, userData }) => {
      const userId = typeof user === 'string' ? user : user.id;
      const email = typeof user === 'string' ? '' : user.email || '';
      
      return userService.createUser(userId, {
        ...userData,
        email,
      });
    },
    onSuccess: (newUser) => {
      // Invalidate the users list query to refetch the updated list
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      // Update the individual user cache
      queryClient.setQueryData(queryKeys.users.byId(newUser.id), newUser);
    },
  });
}
