import { TEST_PREFIX } from './test-data'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/shared/types/database'
import type { CommunityInfo } from '@/features/communities/types'

// Cleanup all test data (for afterAll)
export async function cleanupAllTestData(supabase: SupabaseClient<Database>) {
  // Delete memberships for test communities first
  const { data: testCommunities } = await supabase
    .from('communities')
    .select('id')
    .like('name', `${TEST_PREFIX}%`)
    
  if (testCommunities?.length) {
    const communityIds = testCommunities.map(c => c.id)
    await supabase
      .from('community_memberships')
      .delete()
      .in('community_id', communityIds)
  }
  
  // Delete test communities
  await supabase
    .from('communities')
    .delete()
    .like('name', `${TEST_PREFIX}%`)
  
  // Delete test users from profiles
  await supabase
    .from('profiles')
    .delete()
    .like('email', `${TEST_PREFIX}%`)
}

// Cleanup specific community and its memberships (no-op if community is null/undefined)
export async function cleanupCommunity(
  supabase: SupabaseClient<Database>, 
  community: CommunityInfo | null | undefined
) {
  if (!community) return
  
  await supabase
    .from('community_memberships')
    .delete()
    .eq('community_id', community.id)
    
  await supabase
    .from('communities')
    .delete()
    .eq('id', community.id)
}

// Cleanup specific membership
export async function cleanupMembership(
  supabase: SupabaseClient<Database>,
  communityId: string,
  userId: string
) {
  await supabase
    .from('community_memberships')
    .delete()
    .eq('community_id', communityId)
    .eq('user_id', userId)
}