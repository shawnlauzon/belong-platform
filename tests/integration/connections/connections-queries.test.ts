import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  createTestConnection,
  createTestConnectionRequest,
} from '../helpers/test-data';
import { 
  cleanupAllTestData, 
  cleanupCommunityConnections 
} from '../helpers/cleanup';
import { signIn } from '@/features/auth/api';
import { joinCommunity } from '@/features/communities/api';
import * as connectionsApi from '@/features/connections/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Community } from '@/features/communities';
import type { User } from '@/features/users';

describe('Connections API - Query Operations', () => {
  let supabaseUserA: SupabaseClient<Database>;
  let supabaseUserB: SupabaseClient<Database>;
  let supabaseUserC: SupabaseClient<Database>;
  let userA: User;
  let userB: User;
  let userC: User;
  let testCommunity1: Community;
  let testCommunity2: Community;

  beforeAll(async () => {
    // Create test users and communities
    supabaseUserA = createTestClient();
    supabaseUserB = createTestClient();
    supabaseUserC = createTestClient();

    userA = await createTestUser(supabaseUserA);
    await signIn(supabaseUserA, userA.email, 'TestPass123!');

    userB = await createTestUser(supabaseUserB);
    await signIn(supabaseUserB, userB.email, 'TestPass123!');

    userC = await createTestUser(supabaseUserC);
    await signIn(supabaseUserC, userC.email, 'TestPass123!');

    // Create communities
    testCommunity1 = await createTestCommunity(supabaseUserA);
    testCommunity2 = await createTestCommunity(supabaseUserA);

    // Join communities
    await joinCommunity(supabaseUserB, testCommunity1.id);
    await joinCommunity(supabaseUserC, testCommunity1.id);
    await joinCommunity(supabaseUserB, testCommunity2.id);
    
    // Wait for triggers to complete
    await new Promise(resolve => setTimeout(resolve, 300));
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  beforeEach(async () => {
    // Clean up connections between tests
    await cleanupCommunityConnections(testCommunity1.id);
    await cleanupCommunityConnections(testCommunity2.id);
  });

  describe('fetchUserConnections', () => {
    it('returns empty array when user has no connections', async () => {
      const connections = await connectionsApi.fetchUserConnections(
        supabaseUserA,
        testCommunity1.id
      );

      expect(connections).toEqual([]);
    });

    it('returns user connections for specific community', async () => {
      // Create connections between users
      const connectionAB = await createTestConnection(
        supabaseUserA,
        supabaseUserB,
        testCommunity1.id
      );
      
      const connectionAC = await createTestConnection(
        supabaseUserA,
        supabaseUserC,
        testCommunity1.id
      );

      const connectionsA = await connectionsApi.fetchUserConnections(
        supabaseUserA,
        testCommunity1.id
      );

      expect(connectionsA).toHaveLength(2);
      
      const connectionIds = connectionsA.map(c => c.id);
      expect(connectionIds).toContain(connectionAB.id);
      expect(connectionIds).toContain(connectionAC.id);

      // Verify connection details
      connectionsA.forEach(connection => {
        expect(connection.communityId).toBe(testCommunity1.id);
        expect(
          connection.userAId === userA.id || connection.userBId === userA.id
        ).toBe(true);
      });
    });

    it('shows bidirectional visibility - both users see the connection', async () => {
      const connection = await createTestConnection(
        supabaseUserA,
        supabaseUserB,
        testCommunity1.id
      );

      // UserA should see the connection
      const connectionsA = await connectionsApi.fetchUserConnections(
        supabaseUserA,
        testCommunity1.id
      );

      // UserB should see the same connection
      const connectionsB = await connectionsApi.fetchUserConnections(
        supabaseUserB,
        testCommunity1.id
      );

      expect(connectionsA).toHaveLength(1);
      expect(connectionsB).toHaveLength(1);
      expect(connectionsA[0].id).toBe(connection.id);
      expect(connectionsB[0].id).toBe(connection.id);
      
      // Both should see the same data
      expect(connectionsA[0]).toEqual(connectionsB[0]);
    });

    it('filters connections by community', async () => {
      // Create connections in different communities
      const connectionCommunity1 = await createTestConnection(
        supabaseUserA,
        supabaseUserB,
        testCommunity1.id
      );
      
      const connectionCommunity2 = await createTestConnection(
        supabaseUserA,
        supabaseUserB,
        testCommunity2.id
      );

      // Fetch connections for community 1
      const connectionsCommunity1 = await connectionsApi.fetchUserConnections(
        supabaseUserA,
        testCommunity1.id
      );

      // Fetch connections for community 2
      const connectionsCommunity2 = await connectionsApi.fetchUserConnections(
        supabaseUserA,
        testCommunity2.id
      );

      expect(connectionsCommunity1).toHaveLength(1);
      expect(connectionsCommunity2).toHaveLength(1);
      expect(connectionsCommunity1[0].id).toBe(connectionCommunity1.id);
      expect(connectionsCommunity2[0].id).toBe(connectionCommunity2.id);
      expect(connectionsCommunity1[0].communityId).toBe(testCommunity1.id);
      expect(connectionsCommunity2[0].communityId).toBe(testCommunity2.id);
    });

    it('orders connections by creation date (newest first)', async () => {
      // Create multiple connections with small delays
      const connection1 = await createTestConnection(
        supabaseUserA,
        supabaseUserB,
        testCommunity1.id
      );
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const connection2 = await createTestConnection(
        supabaseUserA,
        supabaseUserC,
        testCommunity1.id
      );

      const connections = await connectionsApi.fetchUserConnections(
        supabaseUserA,
        testCommunity1.id
      );

      expect(connections).toHaveLength(2);
      
      // Should be ordered by created_at DESC (newest first)
      expect(connections[0].id).toBe(connection2.id);
      expect(connections[1].id).toBe(connection1.id);
      expect(connections[0].createdAt.getTime()).toBeGreaterThan(
        connections[1].createdAt.getTime()
      );
    });

    it('handles user who is not a member of community', async () => {
      // UserC tries to fetch connections for community2 (not a member)
      const connections = await connectionsApi.fetchUserConnections(
        supabaseUserC,
        testCommunity2.id
      );

      expect(connections).toEqual([]);
    });
  });

  describe('fetchPendingConnections', () => {
    it('returns empty array when user has no pending requests', async () => {
      const pendingRequests = await connectionsApi.fetchPendingConnections(
        supabaseUserA,
        testCommunity1.id
      );

      expect(pendingRequests).toEqual([]);
    });

    it('returns pending connection requests where user is initiator', async () => {
      // Create pending request (A is initiator, B is requester)
      const { requestId } = await createTestConnectionRequest(
        supabaseUserA,
        supabaseUserB,
        testCommunity1.id
      );

      // UserA (initiator) should see the pending request
      const pendingForA = await connectionsApi.fetchPendingConnections(
        supabaseUserA,
        testCommunity1.id
      );

      // UserB (requester) should not see it in their pending list
      const pendingForB = await connectionsApi.fetchPendingConnections(
        supabaseUserB,
        testCommunity1.id
      );

      expect(pendingForA).toHaveLength(1);
      expect(pendingForB).toHaveLength(0);

      const request = pendingForA[0];
      expect(request.id).toBe(requestId);
      expect(request.initiatorId).toBe(userA.id);
      expect(request.requesterId).toBe(userB.id);
      expect(request.communityId).toBe(testCommunity1.id);
      expect(request.status).toBe('pending');
    });

    it('filters pending requests by community when specified', async () => {
      // Create requests in different communities
      const { requestId: request1 } = await createTestConnectionRequest(
        supabaseUserA,
        supabaseUserB,
        testCommunity1.id
      );
      
      const { requestId: request2 } = await createTestConnectionRequest(
        supabaseUserA,
        supabaseUserB,
        testCommunity2.id
      );

      // Fetch pending for specific community
      const pendingCommunity1 = await connectionsApi.fetchPendingConnections(
        supabaseUserA,
        testCommunity1.id
      );

      const pendingCommunity2 = await connectionsApi.fetchPendingConnections(
        supabaseUserA,
        testCommunity2.id
      );

      expect(pendingCommunity1).toHaveLength(1);
      expect(pendingCommunity2).toHaveLength(1);
      expect(pendingCommunity1[0].id).toBe(request1);
      expect(pendingCommunity2[0].id).toBe(request2);
    });

    it('returns all pending requests across communities when no filter specified', async () => {
      // Create requests in different communities
      await createTestConnectionRequest(
        supabaseUserA,
        supabaseUserB,
        testCommunity1.id
      );
      
      await createTestConnectionRequest(
        supabaseUserA,
        supabaseUserB,
        testCommunity2.id
      );

      // Fetch all pending (no community filter)
      const allPending = await connectionsApi.fetchPendingConnections(supabaseUserA);

      expect(allPending).toHaveLength(2);
      
      const communityIds = allPending.map(r => r.communityId);
      expect(communityIds).toContain(testCommunity1.id);
      expect(communityIds).toContain(testCommunity2.id);
    });

    it('orders pending requests by creation date (newest first)', async () => {
      // Create multiple requests with delays
      const { requestId: request1 } = await createTestConnectionRequest(
        supabaseUserA,
        supabaseUserB,
        testCommunity1.id
      );
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const { requestId: request2 } = await createTestConnectionRequest(
        supabaseUserA,
        supabaseUserC,
        testCommunity1.id
      );

      const pending = await connectionsApi.fetchPendingConnections(
        supabaseUserA,
        testCommunity1.id
      );

      expect(pending).toHaveLength(2);
      
      // Should be ordered by created_at DESC (newest first)
      expect(pending[0].id).toBe(request2);
      expect(pending[1].id).toBe(request1);
      expect(pending[0].createdAt.getTime()).toBeGreaterThan(
        pending[1].createdAt.getTime()
      );
    });

    it('excludes non-pending requests', async () => {
      // Create and approve a request
      const connection = await createTestConnection(
        supabaseUserA,
        supabaseUserB,
        testCommunity1.id
      );

      // Create and reject a request
      const { requestId: rejectRequestId } = await createTestConnectionRequest(
        supabaseUserA,
        supabaseUserC,
        testCommunity1.id
      );
      
      await connectionsApi.rejectConnection(supabaseUserA, rejectRequestId);

      // Create a new pending request
      const { requestId: pendingRequestId } = await createTestConnectionRequest(
        supabaseUserC,
        supabaseUserA,
        testCommunity1.id
      );

      const pending = await connectionsApi.fetchPendingConnections(
        supabaseUserC,
        testCommunity1.id
      );

      // Should only return the truly pending request
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe(pendingRequestId);
      expect(pending[0].status).toBe('pending');
    });

    it('includes proper timestamps and expiration info', async () => {
      const beforeTime = new Date();
      
      const { requestId } = await createTestConnectionRequest(
        supabaseUserA,
        supabaseUserB,
        testCommunity1.id
      );
      
      const afterTime = new Date();

      const pending = await connectionsApi.fetchPendingConnections(
        supabaseUserA,
        testCommunity1.id
      );

      expect(pending).toHaveLength(1);
      
      const request = pending[0];
      expect(request.createdAt).toBeInstanceOf(Date);
      expect(request.expiresAt).toBeInstanceOf(Date);
      expect(request.respondedAt).toBeUndefined();
      
      expect(request.createdAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(request.createdAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
      
      // Expires in 7 days
      const expectedExpiryTime = new Date(request.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
      const timeDiff = Math.abs(request.expiresAt.getTime() - expectedExpiryTime.getTime());
      expect(timeDiff).toBeLessThan(60000); // Within 1 minute tolerance
    });
  });

  describe('Connection Data Consistency', () => {
    it('maintains consistency between connections and requests', async () => {
      const connection = await createTestConnection(
        supabaseUserA,
        supabaseUserB,
        testCommunity1.id
      );

      // Get the original connection request
      const { data: originalRequest } = await supabaseUserA
        .from('connection_requests')
        .select('*')
        .eq('id', connection.connectionRequestId)
        .single();

      expect(originalRequest).toBeTruthy();
      expect(originalRequest!.status).toBe('accepted');
      expect(originalRequest!.responded_at).toBeTruthy();
      expect(originalRequest!.community_id).toBe(testCommunity1.id);
      
      // Connection should reference the original request
      expect(connection.connectionRequestId).toBe(originalRequest!.id);
    });

    it('ensures connection queries return consistent user ordering', async () => {
      // Create connection regardless of who initiates
      const connection1 = await createTestConnection(
        supabaseUserA, // A initiates
        supabaseUserB,
        testCommunity1.id
      );
      
      const connection2 = await createTestConnection(
        supabaseUserB, // B initiates  
        supabaseUserC,
        testCommunity1.id
      );

      // Both users should see the same connection data
      const connectionsFromA = await connectionsApi.fetchUserConnections(
        supabaseUserA,
        testCommunity1.id
      );
      
      const connectionsFromB = await connectionsApi.fetchUserConnections(
        supabaseUserB,
        testCommunity1.id
      );

      // Find the connection between A and B
      const connectionAB_A = connectionsFromA.find(c => c.id === connection1.id);
      const connectionAB_B = connectionsFromB.find(c => c.id === connection1.id);

      expect(connectionAB_A).toBeTruthy();
      expect(connectionAB_B).toBeTruthy();
      expect(connectionAB_A).toEqual(connectionAB_B);
      
      // User ordering should be consistent (smaller ID first)
      expect(connectionAB_A!.userAId < connectionAB_A!.userBId).toBe(true);
    });
  });
});