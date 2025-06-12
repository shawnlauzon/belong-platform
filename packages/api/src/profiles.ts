import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@belongnetwork/core';
import { logger } from '@belongnetwork/core';
import type { User, UpdateProfileData } from '@belongnetwork/types';

// Data functions (pure async functions)
export async function fetchProfile(userId: string): Promise<User | null> {
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

    const user: User = {
      id: data.id,
      first_name: data.user_metadata?.first_name || '',
      last_name: data.user_metadata?.last_name || '',
      full_name: data.user_metadata?.full_name || '',
      avatar_url: data.user_metadata?.avatar_url,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at)
    };

    logger.debug('👤 API: Successfully fetched profile', { userId, name: user.full_name });
    return user;
  } catch (error) {
    logger.error('👤 API: Error fetching profile', { userId, error });
    throw error;
  }
}

export async function updateProfile(data: UpdateProfileData): Promise<User> {
  logger.debug('👤 API: Updating profile');

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to update profile');
    }

    const updateData = {
      user_metadata: {
        first_name: data.first_name,
        last_name: data.last_name,
        full_name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
        avatar_url: data.avatar_url,
        location: data.location
      },
      updated_at: new Date().toISOString()
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

    const profile: User = {
      id: updatedProfile.id,
      first_name: updatedProfile.user_metadata?.first_name || '',
      last_name: updatedProfile.user_metadata?.last_name || '',
      full_name: updatedProfile.user_metadata?.full_name || '',
      avatar_url: updatedProfile.user_metadata?.avatar_url,
      created_at: new Date(updatedProfile.created_at),
      updated_at: new Date(updatedProfile.updated_at)
    };

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
    queryFn: () => fetchProfile(userId),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (updatedProfile) => {
      // Update the profile in cache
      queryClient.setQueryData(['profiles', updatedProfile.id], updatedProfile);
      
      // Also update current user if it's the same user
      const currentUser = queryClient.getQueryData(['auth', 'currentUser']);
      if (currentUser && (currentUser as any).id === updatedProfile.id) {
        queryClient.setQueryData(['auth', 'currentUser'], {
          ...currentUser,
          ...updatedProfile
        });
      }
      
      logger.info('👤 API: Profile updated successfully', { userId: updatedProfile.id });
    },
    onError: (error) => {
      logger.error('👤 API: Failed to update profile', { error });
    }
  });
}