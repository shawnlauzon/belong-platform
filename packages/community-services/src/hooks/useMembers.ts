import { useQuery } from '@tanstack/react-query';
import { supabase } from '@belongnetwork/core';
import { Member } from '@belongnetwork/core';

export function useMembers() {
  return useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*');

      if (error) throw error;
      if (!profiles) return [];

      return profiles.map((profile: any) => {
        const metadata = profile.user_metadata || {};
        return {
          id: profile.id,
          name:
            metadata.full_name || profile.email?.split('@')[0] || 'Anonymous',
          email: profile.email,
          avatar: metadata.avatar_url || '',
          role: metadata.role || 'member',
          lastActive: profile.last_sign_in_at,
          metadata,
        } as unknown as Member;
      });
    },
  });
}

export function useMember(id: string) {
  return useQuery({
    queryKey: ['members', id],
    queryFn: async () => {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!profile) return null;

      const metadata = profile.user_metadata || {};
      return {
        id: profile.id,
        name: metadata.full_name || profile.email?.split('@')[0] || 'Anonymous',
        email: profile.email,
        avatar: metadata.avatar_url || '',
        role: metadata.role || 'member',
        lastActive: profile.last_sign_in_at,
        metadata,
      } as unknown as Member;
    },
  });
}
