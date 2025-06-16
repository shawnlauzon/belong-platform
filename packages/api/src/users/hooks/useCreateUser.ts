import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createUser } from '../impl/createUser';
import type { User, UserData } from '@belongnetwork/types';
import type { User as SupabaseUser } from '@supabase/supabase-js';

type CreateUserInput = {
  user: SupabaseUser | string; // Can be Supabase user object or user ID
  userData: Omit<UserData, 'id' | 'email'>;
};

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation<User, Error, CreateUserInput>({
    mutationFn: async ({ user, userData }) => {
      const userId = typeof user === 'string' ? user : user.id;
      const email = typeof user === 'string' ? '' : user.email || '';
      
      return createUser(userId, {
        ...userData,
        email,
      });
    },
    onSuccess: (newUser) => {
      // Invalidate the users list query to refetch the updated list
      queryClient.invalidateQueries({ queryKey: ['users'] });
      // Update the individual user cache
      queryClient.setQueryData(['user', newUser.id], newUser);
    },
  });
}
