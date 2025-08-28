import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

/**
 * Creates a community conversation for a given community
 * This function calls the database function to create the conversation
 * and automatically add all community members as participants
 * 
 * @param supabase - Supabase client instance
 * @param communityId - ID of the community to create conversation for
 * @returns ID of the created conversation
 */
export async function createCommunityConversation(
  supabase: SupabaseClient<Database>, 
  communityId: string
): Promise<string> {
  const { data, error } = await supabase.rpc('create_community_conversation', {
    p_community_id: communityId
  });

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Failed to create community conversation');
  }

  return data;
}