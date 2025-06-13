import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@belongnetwork/core';
import { logger } from '@belongnetwork/core';
import type { User, UpdateUserData } from '@belongnetwork/types';
import { toDomainUser, toDbUser } from './transformers/userTransformers';

// Data functions (pure async functions)
export async function fetchUser(userId: string): Promise<User | null> {
  logger.debug('👤 API: Fetching profile', { userId });

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Profile not found
      }
      throw error;
    }

    // Transform using the pure transformer function
    const user = toDomainUser(data);

    logger.debug('👤 API: Successfully fetched profile', {
      userId,
      name: user.full_name,
    });
    return user;
  } catch (error) {
    logger.error('👤 API: Error fetching profile', { userId, error });
    throw error;
  }
}

export async function updateUser(data: UpdateUserData): Promise<User> {
  logger.debug('👤 API: Updating profile');

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to update profile');
    }

    const updateData = {
      user_metadata: {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        full_name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
        avatar_url: data.avatar_url,
        location: data.location,
      },
      updated_at: new Date().toISOString(),
    };

    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select('*')
      .single();

    if (error) {
      logger.error('👤 API: Failed to update profile', { error });
      throw error;
    }

    // Transform using the pure transformer function
    const profile = toDomainUser(updatedProfile);

    logger.info('👤 API: Successfully updated profile', { userId: profile.id });
    return profile;
  } catch (error) {
    logger.error('👤 API: Error updating profile', { error });
    throw error;
  }
}

// React Query hooks
export function useProfile(userId: string) {
  return useQuery({
    queryKey: ['profiles', userId],
    queryFn: () => fetchUser(userId),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUser,
    onSuccess: (updatedProfile) => {
      // Update the profile in cache
      queryClient.setQueryData(['profiles', updatedProfile.id], updatedProfile);

      // Also update current user if it's the same user
      const currentUser = queryClient.getQueryData(['auth', 'currentUser']);
      if (currentUser && (currentUser as User).id === updatedProfile.id) {
        queryClient.setQueryData(['auth', 'currentUser'], {
          ...currentUser,
          ...updatedProfile,
        });
      }

      logger.info('👤 API: Profile updated successfully', {
        userId: updatedProfile.id,
      });
    },
    onError: (error) => {
      logger.error('👤 API: Failed to update profile', { error });
    },
  });
}