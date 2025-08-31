import { TEST_PREFIX } from './test-data';
import { createServiceClient } from './test-client';
import type { Community } from '@/features/communities/types';
import type { Resource } from '@/features/resources/types';

// Cleanup all test data (for afterAll) - uses service key for elevated permissions
export async function cleanupAllTestData() {
  // Use service key client for cleanup to bypass RLS policies
  const serviceClient = createServiceClient();

  // Delete memberships for test communities first
  const { data: testCommunities } = await serviceClient
    .from('communities')
    .select('id')
    .like('name', `${TEST_PREFIX}%`);

  let communityIds: string[] = [];
  if (testCommunities?.length) {
    communityIds = testCommunities.map((c) => c.id);
    
    // Clean up trust scores for test communities
    await serviceClient
      .from('trust_scores')
      .delete()
      .in('community_id', communityIds);
    
    // Clean up trust score logs for test communities
    await serviceClient
      .from('trust_score_logs')
      .delete()
      .in('community_id', communityIds);
    
    await serviceClient
      .from('community_memberships')
      .delete()
      .in('community_id', communityIds);
  }

  // Delete test resources
  await serviceClient
    .from('resources')
    .delete()
    .like('title', `${TEST_PREFIX}%`);

  // Delete test connection data
  if (communityIds.length) {
    await serviceClient
      .from('user_connections')
      .delete()
      .in('community_id', communityIds);

    await serviceClient
      .from('connection_requests')
      .delete()
      .in('community_id', communityIds);
  }

  // NOTE: Member codes will be automatically deleted when communities are deleted
  // due to CASCADE constraint, so we don't need to delete them explicitly

  // Delete test communities
  await serviceClient
    .from('communities')
    .delete()
    .like('name', `${TEST_PREFIX}%`);

  // Delete test users from profiles and auth
  const { data: testProfiles } = await serviceClient
    .from('profiles')
    .select('id')
    .like('email', `${TEST_PREFIX}%`);

  // Delete from auth first
  if (testProfiles?.length) {
    for (const profile of testProfiles) {
      const { error } = await serviceClient.auth.admin.deleteUser(profile.id);
      if (error) {
        console.warn(
          `Failed to delete auth user ${profile.id}:`,
          error.message,
        );
      }
    }
  }

  // Also delete any remaining auth users by listing them directly
  const { data: authUsers, error: listError } =
    await serviceClient.auth.admin.listUsers();
  if (!listError && authUsers?.users) {
    const testAuthUsers = authUsers.users.filter((user) =>
      user.email?.startsWith(TEST_PREFIX),
    );

    for (const user of testAuthUsers) {
      const { error } = await serviceClient.auth.admin.deleteUser(user.id);
      if (error) {
        console.warn(
          `Failed to delete auth user ${user.id} (${user.email}):`,
          error.message,
        );
      }
    }
  }

  // Then delete from profiles (may be cascade deleted already)
  await serviceClient
    .from('profiles')
    .delete()
    .like('email', `${TEST_PREFIX}%`);
}

// Cleanup specific community and its memberships (no-op if community is null/undefined)
export async function cleanupCommunity(
  community: Community | null | undefined,
) {
  if (!community) return;

  // Use service key client for cleanup to bypass RLS policies
  const serviceClient = createServiceClient();

  await serviceClient
    .from('community_memberships')
    .delete()
    .eq('community_id', community.id);

  await serviceClient.from('communities').delete().eq('id', community.id);
}

// Cleanup specific membership
export async function cleanupMembership(communityId: string, userId: string) {
  // Use service key client for cleanup to bypass RLS policies
  const serviceClient = createServiceClient();

  // Delete the membership
  await serviceClient
    .from('community_memberships')
    .delete()
    .eq('community_id', communityId)
    .eq('user_id', userId);

  // Also delete any connection codes to prevent conflicts
  await serviceClient
    .from('community_member_codes')
    .delete()
    .eq('community_id', communityId)
    .eq('user_id', userId);
}

// Cleanup specific resource
export async function cleanupResource(resource: Resource | null | undefined) {
  if (!resource) return;

  // Use service key client for cleanup to bypass RLS policies
  const serviceClient = createServiceClient();

  await serviceClient.from('resources').delete().eq('id', resource.id);
}

// Cleanup specific user
export async function cleanupUser(userId: string) {
  // Use service key client for cleanup to bypass RLS policies
  const serviceClient = createServiceClient();

  // Delete user from auth using Admin API
  const { error } = await serviceClient.auth.admin.deleteUser(userId);

  if (error) {
    console.warn(`Failed to delete user ${userId}:`, error.message);
  }
}

export async function cleanupShoutout(shoutoutId: string) {
  // Use service key client for cleanup to bypass RLS policies
  const serviceClient = createServiceClient();

  // Delete user from auth using Admin API
  const { error } = await serviceClient
    .from('shoutouts')
    .delete()
    .eq('id', shoutoutId);

  if (error) {
    console.warn(`Failed to delete shoutout ${shoutoutId}:`, error.message);
  }
}

// Cleanup specific resource response
export async function cleanupResourceResponse(
  resourceId: string,
  userId: string,
) {
  // Use service key client for cleanup to bypass RLS policies
  const serviceClient = createServiceClient();

  await serviceClient
    .from('resource_responses')
    .delete()
    .eq('resource_id', resourceId)
    .eq('user_id', userId);
}

// Cleanup all resource responses for a resource
export async function cleanupResourceResponses(resourceId: string) {
  // Use service key client for cleanup to bypass RLS policies
  const serviceClient = createServiceClient();

  await serviceClient
    .from('resource_responses')
    .delete()
    .eq('resource_id', resourceId);
}

// Cleanup all resource claims for a resource
export async function cleanupResourceClaims(resourceId: string) {
  // Use service key client for cleanup to bypass RLS policies
  const serviceClient = createServiceClient();

  await serviceClient
    .from('resource_claims')
    .delete()
    .eq('resource_id', resourceId);
}

// Cleanup specific resource claim
export async function cleanupResourceClaim(claimId: string) {
  // Use service key client for cleanup to bypass RLS policies
  const serviceClient = createServiceClient();

  await serviceClient.from('resource_claims').delete().eq('id', claimId);
}

// Cleanup connection data for a specific community (preserves member codes)
export async function cleanupCommunityConnections(communityId: string) {
  const serviceClient = createServiceClient();

  // Delete user connections for this community
  await serviceClient
    .from('user_connections')
    .delete()
    .eq('community_id', communityId);

  // Delete connection requests for this community
  await serviceClient
    .from('connection_requests')
    .delete()
    .eq('community_id', communityId);

  // NOTE: We don't delete member codes as they are auto-generated when users join
  // communities and are needed for connection functionality to work
}

// Cleanup specific connection request
export async function cleanupConnectionRequest(requestId: string) {
  const serviceClient = createServiceClient();
  
  await serviceClient
    .from('connection_requests')
    .delete()
    .eq('id', requestId);
}

// Cleanup specific user connection
export async function cleanupUserConnection(connectionId: string) {
  const serviceClient = createServiceClient();
  
  await serviceClient
    .from('user_connections')
    .delete()
    .eq('id', connectionId);
}

// Cleanup member code for specific user and community
// WARNING: This removes auto-generated codes and may break connection functionality
export async function cleanupMemberCode(userId: string, communityId: string) {
  const serviceClient = createServiceClient();
  
  await serviceClient
    .from('community_member_codes')
    .delete()
    .eq('user_id', userId)
    .eq('community_id', communityId);
}
