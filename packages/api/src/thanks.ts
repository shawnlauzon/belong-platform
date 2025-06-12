import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@belongnetwork/core';
import { logger } from '@belongnetwork/core';
import type { 
  Thanks, 
  CreateThanksData, 
  UpdateThanksData 
} from '@belongnetwork/types';

// Data functions (pure async functions)
export async function fetchThanks(): Promise<Thanks[]> {
  logger.debug('🙏 API: Fetching thanks');

  try {
    const { data, error } = await supabase
      .from('thanks')
      .select(`
        *,
        from_user:profiles!thanks_from_user_id_fkey1(
          id,
          email,
          user_metadata
        ),
        to_user:profiles!thanks_to_user_id_fkey1(
          id,
          email,
          user_metadata
        ),
        resource:resources(
          id,
          title,
          type,
          category
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('🙏 API: Failed to fetch thanks', { error });
      throw error;
    }

    const thanks: Thanks[] = (data || []).map(transformDbThanksToDomain);
    
    logger.debug('🙏 API: Successfully fetched thanks', { count: thanks.length });
    return thanks;
  } catch (error) {
    logger.error('🙏 API: Error fetching thanks', { error });
    throw error;
  }
}

export async function fetchThanksById(id: string): Promise<Thanks | null> {
  logger.debug('🙏 API: Fetching thanks by ID', { id });

  try {
    const { data, error } = await supabase
      .from('thanks')
      .select(`
        *,
        from_user:profiles!thanks_from_user_id_fkey1(
          id,
          email,
          user_metadata
        ),
        to_user:profiles!thanks_to_user_id_fkey1(
          id,
          email,
          user_metadata
        ),
        resource:resources(
          id,
          title,
          type,
          category
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Thanks not found
      }
      throw error;
    }

    const thanks = transformDbThanksToDomain(data);
    logger.debug('🙏 API: Successfully fetched thanks', { id });
    return thanks;
  } catch (error) {
    logger.error('🙏 API: Error fetching thanks by ID', { id, error });
    throw error;
  }
}

export async function createThanks(data: CreateThanksData): Promise<Thanks> {
  logger.debug('🙏 API: Creating thanks', { to_user_id: data.to_user_id });

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to create thanks');
    }

    const thanksData = {
      ...data,
      from_user_id: user.id
    };

    const { data: newThanks, error } = await supabase
      .from('thanks')
      .insert(thanksData)
      .select(`
        *,
        from_user:profiles!thanks_from_user_id_fkey1(
          id,
          email,
          user_metadata
        ),
        to_user:profiles!thanks_to_user_id_fkey1(
          id,
          email,
          user_metadata
        ),
        resource:resources(
          id,
          title,
          type,
          category
        )
      `)
      .single();

    if (error) {
      logger.error('🙏 API: Failed to create thanks', { error });
      throw error;
    }

    const thanks = transformDbThanksToDomain(newThanks);
    logger.info('🙏 API: Successfully created thanks', { id: thanks.id });
    return thanks;
  } catch (error) {
    logger.error('🙏 API: Error creating thanks', { error });
    throw error;
  }
}

export async function updateThanks(data: UpdateThanksData): Promise<Thanks> {
  logger.debug('🙏 API: Updating thanks', { id: data.id });

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to update thanks');
    }

    const updateData = {
      ...data,
      updated_at: new Date().toISOString()
    };

    const { data: updatedThanks, error } = await supabase
      .from('thanks')
      .update(updateData)
      .eq('id', data.id)
      .eq('from_user_id', user.id) // Ensure user owns the thanks
      .select(`
        *,
        from_user:profiles!thanks_from_user_id_fkey1(
          id,
          email,
          user_metadata
        ),
        to_user:profiles!thanks_to_user_id_fkey1(
          id,
          email,
          user_metadata
        ),
        resource:resources(
          id,
          title,
          type,
          category
        )
      `)
      .single();

    if (error) {
      logger.error('🙏 API: Failed to update thanks', { error });
      throw error;
    }

    const thanks = transformDbThanksToDomain(updatedThanks);
    logger.info('🙏 API: Successfully updated thanks', { id: thanks.id });
    return thanks;
  } catch (error) {
    logger.error('🙏 API: Error updating thanks', { error });
    throw error;
  }
}

export async function deleteThanks(id: string): Promise<void> {
  logger.debug('🙏 API: Deleting thanks', { id });

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to delete thanks');
    }

    const { error } = await supabase
      .from('thanks')
      .delete()
      .eq('id', id)
      .eq('from_user_id', user.id); // Ensure user owns the thanks

    if (error) {
      logger.error('🙏 API: Failed to delete thanks', { error });
      throw error;
    }

    logger.info('🙏 API: Successfully deleted thanks', { id });
  } catch (error) {
    logger.error('🙏 API: Error deleting thanks', { error });
    throw error;
  }
}

// Helper function to transform database records to domain objects
function transformDbThanksToDomain(dbThanks: any): Thanks {
  const from_user = dbThanks.from_user ? {
    id: dbThanks.from_user.id,
    email: dbThanks.from_user.email,
    first_name: dbThanks.from_user.user_metadata?.first_name || '',
    last_name: dbThanks.from_user.user_metadata?.last_name || '',
    full_name: dbThanks.from_user.user_metadata?.full_name || '',
    avatar_url: dbThanks.from_user.user_metadata?.avatar_url,
    created_at: new Date(),
    updated_at: new Date()
  } : null;

  const to_user = dbThanks.to_user ? {
    id: dbThanks.to_user.id,
    email: dbThanks.to_user.email,
    first_name: dbThanks.to_user.user_metadata?.first_name || '',
    last_name: dbThanks.to_user.user_metadata?.last_name || '',
    full_name: dbThanks.to_user.user_metadata?.full_name || '',
    avatar_url: dbThanks.to_user.user_metadata?.avatar_url,
    created_at: new Date(),
    updated_at: new Date()
  } : null;

  const resource = dbThanks.resource ? {
    id: dbThanks.resource.id,
    title: dbThanks.resource.title,
    type: dbThanks.resource.type,
    category: dbThanks.resource.category
  } : null;

  return {
    id: dbThanks.id,
    message: dbThanks.message,
    image_urls: dbThanks.image_urls || [],
    impact_description: dbThanks.impact_description,
    created_at: new Date(dbThanks.created_at),
    updated_at: new Date(dbThanks.updated_at || dbThanks.created_at),
    from_user: from_user!,
    to_user: to_user!,
    resource: resource as any // TODO: Fix resource type
  };
}

// React Query hooks
export function useThanks() {
  return useQuery({
    queryKey: ['thanks'],
    queryFn: fetchThanks,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useThanksByUser(userId: string) {
  return useQuery({
    queryKey: ['thanks', 'user', userId],
    queryFn: async () => {
      const allThanks = await fetchThanks();
      return allThanks.filter(thanks => 
        thanks.from_user.id === userId || thanks.to_user.id === userId
      );
    },
    enabled: !!userId,
  });
}

export function useCreateThanks() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createThanks,
    onSuccess: (newThanks) => {
      // Invalidate and refetch thanks list
      queryClient.invalidateQueries({ queryKey: ['thanks'] });
      
      // Add the new thanks to the cache
      queryClient.setQueryData(['thanks', newThanks.id], newThanks);
      
      logger.info('🙏 API: Thanks created successfully', { id: newThanks.id });
    },
    onError: (error) => {
      logger.error('🙏 API: Failed to create thanks', { error });
    }
  });
}

export function useUpdateThanks() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateThanks,
    onSuccess: (updatedThanks) => {
      // Invalidate and refetch thanks list
      queryClient.invalidateQueries({ queryKey: ['thanks'] });
      
      // Update the specific thanks in cache
      queryClient.setQueryData(['thanks', updatedThanks.id], updatedThanks);
      
      logger.info('🙏 API: Thanks updated successfully', { id: updatedThanks.id });
    },
    onError: (error) => {
      logger.error('🙏 API: Failed to update thanks', { error });
    }
  });
}

export function useDeleteThanks() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteThanks,
    onSuccess: (_, deletedId) => {
      // Invalidate and refetch thanks list
      queryClient.invalidateQueries({ queryKey: ['thanks'] });
      
      // Remove the thanks from cache
      queryClient.removeQueries({ queryKey: ['thanks', deletedId] });
      
      logger.info('🙏 API: Thanks deleted successfully', { id: deletedId });
    },
    onError: (error) => {
      logger.error('🙏 API: Failed to delete thanks', { error });
    }
  });
}