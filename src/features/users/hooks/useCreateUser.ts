import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/shared';
import { useSupabase } from '@/shared';
import { createUser } from '../api';
import type { CurrentUser } from '../types';
import { userKeys } from '../queries';
import { authKeys } from '@/features/auth/queries';
import { getAuthIdOrThrow } from '@/shared/utils/auth-helpers';

/**
 * Hook for creating new user profiles.
 *
 * @returns React Query mutation result with create function and state
 */
export function useCreateUser() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  const mutation = useMutation({
    mutationFn: async (userData: Omit<CurrentUser, 'id' | 'createdAt' | 'updatedAt'>) => {
      logger.debug('👤 useCreateUser: Creating user', { userData });
      const userId = await getAuthIdOrThrow(supabase);
      return createUser(supabase, userId, userData);
    },
    onSuccess: (newUser: CurrentUser) => {
      // Invalidate all user queries to refetch lists
      queryClient.invalidateQueries({ queryKey: userKeys.all });

      // Set the current user in cache (since this creates the current user)
      queryClient.setQueryData(authKeys.currentUser(), newUser);

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
