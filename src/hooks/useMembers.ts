import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Member } from '@/types';

export function useMembers() {
  return useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const { data: users, error } = await supabase
        .from('users')
        .select('*');

      if (error) throw error;
      if (!users) return [];

      return users.map(user => ({
        id: user.id,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
        avatar_url: user.user_metadata?.avatar_url,
        trust_score: 5.0, // Default score until we implement trust scoring
        location: user.user_metadata?.location || null,
        community_tenure_months: 0, // Default until we implement tenure tracking
        thanks_received: 0, // Default until we implement thanks
        resources_shared: 0 // Will be calculated from resources table
      }));
    }
  });
}

export function useMember(id: string) {
  return useQuery({
    queryKey: ['members', id],
    queryFn: async () => {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!user) throw new Error('User not found');

      // Get the user's shared resources count
      const { count: resourcesShared } = await supabase
        .from('resources')
        .select('*', { count: 'exact', head: true })
        .eq('member_id', id)
        .eq('type', 'offer');

      return {
        id: user.id,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
        avatar_url: user.user_metadata?.avatar_url,
        trust_score: 5.0, // Default score until we implement trust scoring
        location: user.user_metadata?.location || null,
        community_tenure_months: 0, // Default until we implement tenure tracking
        thanks_received: 0, // Default until we implement thanks
        resources_shared: resourcesShared || 0
      } as Member;
    }
  });
}