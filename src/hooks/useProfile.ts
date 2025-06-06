import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logger, logComponentRender, logApiCall, logApiResponse } from '@/lib/logger';

export function useProfile(userId: string | undefined) {
  logComponentRender('useProfile', { userId });
  
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');

      logger.debug('👤 useProfile: Fetching profile for user:', { userId });
      logApiCall('GET', `/profiles/${userId}`, { userId });

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        logApiResponse('GET', `/profiles/${userId}`, null, error);
        throw error;
      }
      
      logApiResponse('GET', `/profiles/${userId}`, { 
        hasProfile: !!profile,
        hasMetadata: !!profile?.user_metadata 
      });
      
      logger.debug('👤 useProfile: Profile fetched:', { 
        userId, 
        email: profile?.email,
        hasMetadata: !!profile?.user_metadata 
      });
      
      return profile;
    },
    enabled: !!userId,
  });

  const mutation = useMutation({
    mutationFn: async (metadata: any) => {
      if (!userId) throw new Error('User ID is required');

      logger.debug('👤 useProfile: Updating profile metadata:', { userId, metadata });
      logApiCall('PATCH', `/profiles/${userId}`, { metadata });

      // First, fetch the current profile to get existing user_metadata
      const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('user_metadata')
        .eq('id', userId)
        .single();

      if (fetchError) {
        logApiResponse('GET', `/profiles/${userId}/metadata`, null, fetchError);
        throw fetchError;
      }

      // Merge the new metadata with existing user_metadata
      const existingMetadata = currentProfile?.user_metadata || {};
      const mergedMetadata = {
        ...existingMetadata,
        ...metadata
      };

      logger.debug('👤 useProfile: Merging metadata:', {
        userId,
        existingMetadata,
        newMetadata: metadata,
        mergedMetadata
      });

      const { error } = await supabase
        .from('profiles')
        .update({ user_metadata: mergedMetadata })
        .eq('id', userId);

      if (error) {
        logApiResponse('PATCH', `/profiles/${userId}`, null, error);
        throw error;
      }
      
      logApiResponse('PATCH', `/profiles/${userId}`, { success: true });
      logger.info('✅ useProfile: Profile updated successfully:', { userId });
    },
    onSuccess: () => {
      logger.debug('👤 useProfile: Invalidating queries after successful update');
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['members', userId] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });

  return {
    ...query,
    updateProfile: mutation.mutate,
    isUpdating: mutation.isPending,
  };
}