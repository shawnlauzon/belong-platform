import { createCommunity } from '@/features/communities/api'
import { signUp } from '@/features/auth/api'
import { createFakeCommunityData } from '@/features/communities/__fakes__'
import { createFakeUserData } from '@/features/users/__fakes__'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/shared/types/database'

// Test data prefix to identify test records
export const TEST_PREFIX = 'test_int_'

export async function createTestUser(supabase: SupabaseClient<Database>) {
  const userData = createFakeUserData()
  const testEmail = `${TEST_PREFIX}${Date.now()}@example.com`
  const firstName = `${TEST_PREFIX}FirstName`
  const lastName = `${TEST_PREFIX}LastName`
  
  const account = await signUp(
    supabase,
    testEmail,
    'TestPass123!',
    firstName,
    lastName
  )
  
  return account
}

export async function createTestCommunity(
  supabase: SupabaseClient<Database>, 
  organizerId: string
) {
  const data = createFakeCommunityData({ 
    organizerId,
    name: `${TEST_PREFIX}Community_${Date.now()}`,
    description: `${TEST_PREFIX} test community`
  })
  
  const community = await createCommunity(supabase, data)
  if (!community) throw new Error('Failed to create community')
  
  return community
}