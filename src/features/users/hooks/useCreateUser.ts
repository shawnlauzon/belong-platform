import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { logger, queryKeys } from '../../../shared';
import { useSupabase } from '../../../shared';
import { createUserService } from '../services/user.service';
import type { UserData, User } from '../types';

/**
 * Hook for creating new user profiles.
 * 
 * @returns React Query mutation result with create function and state
 */
export function useCreateUser() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const userService = createUserService(supabase);

  const mutation = useMutation({
    mutationFn: ({ accountId, userData }: { accountId: string; userData: UserData }) => {
      logger.debug('👤 useCreateUser: Creating user', { accountId, userData });
      return userService.createUser(accountId, userData);
    },
    onSuccess: (newUser: User) => {
      // Invalidate all user queries to refetch lists
      queryClient.invalidateQueries({ queryKey: ['users'] });

      // Set the new user in cache for immediate access
      queryClient.setQueryData(
        queryKeys.users.byId(newUser.id),
        newUser
      );

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

  // Return mutation with stable function reference
  return {
    ...mutation,
    mutate: useCallback(mutation.mutate, [mutation.mutate]),
    mutateAsync: useCallback(mutation.mutateAsync, [mutation.mutateAsync]),
  };
}