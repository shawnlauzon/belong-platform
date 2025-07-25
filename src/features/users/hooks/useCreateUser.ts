import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/shared';
import { useSupabase } from '@/shared';
import { createUser } from '../api';
import type { UserData, User } from '../types';
import { userKeys } from '../queries';

/**
 * Hook for creating new user profiles.
 *
 * @returns React Query mutation result with create function and state
 */
export function useCreateUser() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  const mutation = useMutation({
    mutationFn: (userData: UserData) => {
      logger.debug('👤 useCreateUser: Creating user', { userData });
      return createUser(supabase, userData);
    },
    onSuccess: (newUser: User) => {
      // Invalidate all user queries to refetch lists
      queryClient.invalidateQueries({ queryKey: userKeys.all });

      // Set the new user in cache for immediate access
      queryClient.setQueryData(userKeys.detail(newUser.id), newUser);

      logger.info('👤 useCreateUser: Successfully created user', {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
      });
    },
    onError: (error) => {
      logger.error('👤 useCreateUser: Failed to create user', {
        error,
      });
    },
  });

  return mutation;
}
