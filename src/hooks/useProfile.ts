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

      const { error } = await supabase
        .from('profiles')
        .update({ user_metadata: metadata })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });

  return {
    ...query,
    updateProfile: mutation.mutate,
    isUpdating: mutation.isPending,
  };
}