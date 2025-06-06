import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useProfile(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return profile;
    },
    enabled: !!userId,
  });

  const mutation = useMutation({
    mutationFn: async (metadata: any) => {
      if (!userId) throw new Error('User ID is required');

      // First, fetch the current profile to get existing user_metadata
      const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('user_metadata')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      // Merge the new metadata with existing user_metadata
      const existingMetadata = currentProfile?.user_metadata || {};
      const mergedMetadata = {
        ...existingMetadata,
        ...metadata
      };

      console.log('🔄 Updating profile metadata:', {
        userId,
        existingMetadata,
        newMetadata: metadata,
        mergedMetadata
      });

      const { error } = await supabase
        .from('profiles')
        .update({ user_metadata: mergedMetadata })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
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