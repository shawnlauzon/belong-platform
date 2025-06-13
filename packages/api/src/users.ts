import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@belongnetwork/core';
import { logger } from '@belongnetwork/core';
import type { User, UpdateUserData, UserFilter, PaginatedResponse } from '@belongnetwork/types';
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

export async function fetchUsers(filters: UserFilter = {}): Promise<PaginatedResponse<User>> {
  logger.debug('👤 API: Fetching users', { filters });

  try {
    const { searchTerm, page = 1, pageSize = 20 } = filters;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply search filter if provided
    if (searchTerm && searchTerm.trim()) {
      const searchPattern = `%${searchTerm.trim()}%`;
      query = query.or(
        `user_metadata->>first_name.ilike.${searchPattern},user_metadata->>last_name.ilike.${searchPattern},email.ilike.${searchPattern}`
      );
    }

    // Apply pagination
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      logger.error('👤 API: Failed to fetch users', { error });
      throw error;
    }

    // Transform database records to domain objects
    const users: User[] = (data || []).map(toDomainUser);

    const result: PaginatedResponse<User> = {
      data: users,
      count: count || 0,
      page,
      pageSize,
    };

    logger.debug('👤 API: Successfully fetched users', {
      count: users.length,
      total: count,
      page,
    });
    return result;
  } catch (error) {
    logger.error('👤 API: Error fetching users', { error });
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
export function useUser(userId: string) {
  return useQuery({
    queryKey: ['users', userId],
    queryFn: () => fetchUser(userId),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useUsers(filters: UserFilter = {}) {
  return useQuery({
    queryKey: ['users', 'list', filters],
    queryFn: () => fetchUsers(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUser,
    onSuccess: (updatedProfile) => {
      // Update the profile in cache
      queryClient.setQueryData(['users', updatedProfile.id], updatedProfile);

      // Invalidate users list to refresh any cached lists
      queryClient.invalidateQueries({ queryKey: ['users', 'list'] });

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