import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  createTestMemberConnectionCode,
  createTestConnectionRequest,
  createTestConnection,
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

describe('Connections API - Permissions and Security', () => {
  let supabaseUserA: SupabaseClient<Database>;
  let supabaseUserB: SupabaseClient<Database>;
  let supabaseUserC: SupabaseClient<Database>;
  let userA: User;
  let userB: User;
  let userC: User;
  let testCommunity: Community;

  beforeAll(async () => {
    // Create test users and community
    supabaseUserA = createTestClient();
    supabaseUserB = createTestClient();
    supabaseUserC = createTestClient();

    userA = await createTestUser(supabaseUserA);
    await signIn(supabaseUserA, userA.email, 'TestPass123!');

    userB = await createTestUser(supabaseUserB);
    await signIn(supabaseUserB, userB.email, 'TestPass123!');

    userC = await createTestUser(supabaseUserC);
    await signIn(supabaseUserC, userC.email, 'TestPass123!');

    // Create community and join all users
    testCommunity = await createTestCommunity(supabaseUserA);
    await joinCommunity(supabaseUserB, testCommunity.id);
    await joinCommunity(supabaseUserC, testCommunity.id);
    
    // Wait for triggers to complete
    await new Promise(resolve => setTimeout(resolve, 300));
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  beforeEach(async () => {
    // Clean up connections between tests
    await cleanupCommunityConnections(testCommunity.id);
  });

  describe('Row Level Security - Member Codes', () => {
    it('users can only view their own member codes', async () => {
      // Get member codes for both users
      const codeA = await createTestMemberConnectionCode(supabaseUserA, testCommunity.id);
      const codeB = await createTestMemberConnectionCode(supabaseUserB, testCommunity.id);

      // UserA should only see their own code
      const { data: codesForA } = await supabaseUserA
        .from('community_member_codes')
        .select('*')
        .eq('community_id', testCommunity.id);

      // UserB should only see their own code
      const { data: codesForB } = await supabaseUserB
        .from('community_member_codes')
        .select('*')
        .eq('community_id', testCommunity.id);

      expect(codesForA).toHaveLength(1);
      expect(codesForB).toHaveLength(1);
      expect(codesForA![0].user_id).toBe(userA.id);
      expect(codesForB![0].user_id).toBe(userB.id);
      expect(codesForA![0].code).not.toBe(codesForB![0].code);
    });

    it('users cannot view other users member codes directly', async () => {
      const codeA = await createTestMemberConnectionCode(supabaseUserA, testCommunity.id);

      // UserB tries to query UserA's specific code
      const { data: codeData } = await supabaseUserB
        .from('community_member_codes')
        .select('*')
        .eq('code', codeA.code);

      expect(codeData).toHaveLength(0);
    });

    it('users can insert their own member codes', async () => {
      // This is tested indirectly through getMemberConnectionCode, but let's verify RLS
      const beforeCount = await supabaseUserA
        .from('community_member_codes')
        .select('count', { count: 'exact' })
        .eq('user_id', userA.id)
        .eq('community_id', testCommunity.id);

      await createTestMemberConnectionCode(supabaseUserA, testCommunity.id);

      const afterCount = await supabaseUserA
        .from('community_member_codes')
        .select('count', { count: 'exact' })
        .eq('user_id', userA.id)
        .eq('community_id', testCommunity.id);

      expect(afterCount.count).toBeGreaterThan(beforeCount.count || 0);
    });

    it('users can update their own member codes', async () => {
      await createTestMemberConnectionCode(supabaseUserA, testCommunity.id);

      // UserA updates their own code's active status
      const { error } = await supabaseUserA
        .from('community_member_codes')
        .update({ is_active: false })
        .eq('user_id', userA.id)
        .eq('community_id', testCommunity.id);

      expect(error).toBeNull();

      // Verify the update worked
      const { data: updatedCode } = await supabaseUserA
        .from('community_member_codes')
        .select('is_active')
        .eq('user_id', userA.id)
        .eq('community_id', testCommunity.id)
        .single();

      expect(updatedCode!.is_active).toBe(false);
    });

    it('users cannot update other users member codes', async () => {
      const codeA = await createTestMemberConnectionCode(supabaseUserA, testCommunity.id);

      // UserB tries to update UserA's code
      const { error } = await supabaseUserB
        .from('community_member_codes')
        .update({ is_active: false })
        .eq('user_id', userA.id)
        .eq('community_id', testCommunity.id);

      // Should not affect any rows due to RLS
      expect(error).toBeNull(); // No error, but no rows affected
      
      // Verify UserA's code wasn't changed
      const { data: unchangedCode } = await supabaseUserA
        .from('community_member_codes')
        .select('is_active')
        .eq('user_id', userA.id)
        .eq('community_id', testCommunity.id)
        .single();

      expect(unchangedCode!.is_active).toBe(true); // Should remain unchanged
    });
  });

  describe('Row Level Security - Connection Requests', () => {
    it('users can only view connection requests they are involved in', async () => {
      // Create request between A and B
      const { requestId } = await createTestConnectionRequest(
        supabaseUserA,
        supabaseUserB,
        testCommunity.id
      );

      // UserA (initiator) should see the request
      const { data: requestsForA } = await supabaseUserA
        .from('connection_requests')
        .select('*')
        .eq('id', requestId);

      // UserB (requester) should see the request  
      const { data: requestsForB } = await supabaseUserB
        .from('connection_requests')
        .select('*')
        .eq('id', requestId);

      // UserC (uninvolved) should not see the request
      const { data: requestsForC } = await supabaseUserC
        .from('connection_requests')
        .select('*')
        .eq('id', requestId);

      expect(requestsForA).toHaveLength(1);
      expect(requestsForB).toHaveLength(1);
      expect(requestsForC).toHaveLength(0);
    });

    it('users can create connection requests as requester', async () => {
      const codeA = await createTestMemberConnectionCode(supabaseUserA, testCommunity.id);

      // UserB creates a request by processing UserA's code
      const response = await connectionsApi.processConnectionLink(
        supabaseUserB,
        codeA.code
      );

      expect(response.success).toBe(true);
      expect(response.connectionRequestId).toBeTruthy();

      // Verify the request was created with correct permissions
      const { data: createdRequest } = await supabaseUserB
        .from('connection_requests')
        .select('*')
        .eq('id', response.connectionRequestId!)
        .single();

      expect(createdRequest).toBeTruthy();
      expect(createdRequest!.requester_id).toBe(userB.id);
      expect(createdRequest!.initiator_id).toBe(userA.id);
    });

    it('only initiators can update connection requests', async () => {
      const { requestId } = await createTestConnectionRequest(
        supabaseUserA,
        supabaseUserB,
        testCommunity.id
      );

      // UserA (initiator) can update the request
      const { error: updateErrorA } = await supabaseUserA
        .from('connection_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      expect(updateErrorA).toBeNull();

      // Verify the update worked
      const { data: updatedRequest } = await supabaseUserA
        .from('connection_requests')
        .select('status')
        .eq('id', requestId)
        .single();

      expect(updatedRequest!.status).toBe('rejected');

      // Reset for next test
      await supabaseUserA
        .from('connection_requests')
        .update({ status: 'pending' })
        .eq('id', requestId);

      // UserB (requester) cannot update the request
      const { error: updateErrorB } = await supabaseUserB
        .from('connection_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      expect(updateErrorB).toBeNull(); // No error, but no rows affected

      // Verify the request wasn't changed by UserB
      const { data: unchangedRequest } = await supabaseUserA
        .from('connection_requests')
        .select('status')
        .eq('id', requestId)
        .single();

      expect(unchangedRequest!.status).toBe('pending'); // Should remain unchanged
    });

    it('users cannot update connection requests they are not involved in', async () => {
      const { requestId } = await createTestConnectionRequest(
        supabaseUserA,
        supabaseUserB,
        testCommunity.id
      );

      // UserC (not involved) cannot update the request
      const { error } = await supabaseUserC
        .from('connection_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      expect(error).toBeNull(); // No error, but no rows affected

      // Verify the request wasn't changed
      const { data: unchangedRequest } = await supabaseUserA
        .from('connection_requests')
        .select('status')
        .eq('id', requestId)
        .single();

      expect(unchangedRequest!.status).toBe('pending');
    });
  });

  describe('Row Level Security - User Connections', () => {
    it('users can only view their own connections', async () => {
      // Create connection between A and B
      const connectionAB = await createTestConnection(
        supabaseUserA,
        supabaseUserB,
        testCommunity.id
      );

      // Create connection between B and C (A not involved)
      const connectionBC = await createTestConnection(
        supabaseUserB,
        supabaseUserC,
        testCommunity.id
      );

      // UserA should see connection AB but not BC
      const { data: connectionsForA } = await supabaseUserA
        .from('user_connections')
        .select('*')
        .eq('community_id', testCommunity.id);

      // UserB should see both connections (involved in both)
      const { data: connectionsForB } = await supabaseUserB
        .from('user_connections')
        .select('*')
        .eq('community_id', testCommunity.id);

      // UserC should see connection BC but not AB
      const { data: connectionsForC } = await supabaseUserC
        .from('user_connections')
        .select('*')
        .eq('community_id', testCommunity.id);

      expect(connectionsForA).toHaveLength(1);
      expect(connectionsForB).toHaveLength(2);
      expect(connectionsForC).toHaveLength(1);

      expect(connectionsForA![0].id).toBe(connectionAB.id);
      expect(connectionsForC![0].id).toBe(connectionBC.id);

      const connectionBIds = connectionsForB!.map(c => c.id);
      expect(connectionBIds).toContain(connectionAB.id);
      expect(connectionBIds).toContain(connectionBC.id);
    });

    it('users cannot directly insert user connections', async () => {
      // Users should not be able to create connections directly
      // They must go through the approval process
      const { error } = await supabaseUserA
        .from('user_connections')
        .insert({
          user_a_id: userA.id,
          user_b_id: userB.id,
          community_id: testCommunity.id,
          connection_request_id: '00000000-0000-0000-0000-000000000000', // fake ID
        });

      // Should fail due to RLS policy (only system can create connections)
      expect(error).toBeTruthy();
      expect(error!.code).toBe('42501'); // Insufficient privilege
    });

    it('system can create connections through approval process', async () => {
      // This is tested indirectly through createTestConnection
      // The database function creates connections with elevated privileges
      const connection = await createTestConnection(
        supabaseUserA,
        supabaseUserB,
        testCommunity.id
      );

      expect(connection).toBeTruthy();
      expect(connection.userAId).toBeTruthy();
      expect(connection.userBId).toBeTruthy();
    });
  });

  describe('Cross-User Security Scenarios', () => {
    it('prevents users from seeing unrelated connection codes', async () => {
      const codeA = await createTestMemberConnectionCode(supabaseUserA, testCommunity.id);
      const codeB = await createTestMemberConnectionCode(supabaseUserB, testCommunity.id);

      // UserC tries to query all codes in the community
      const { data: allCodes } = await supabaseUserC
        .from('community_member_codes')
        .select('*')
        .eq('community_id', testCommunity.id);

      // Should only see their own code
      expect(allCodes).toHaveLength(1);
      expect(allCodes![0].user_id).toBe(userC.id);
    });

    it('prevents users from approving others requests', async () => {
      const { requestId } = await createTestConnectionRequest(
        supabaseUserA,
        supabaseUserB,
        testCommunity.id
      );

      // UserC tries to approve UserA's request (should fail)
      await expect(
        connectionsApi.approveConnection(supabaseUserC, requestId)
      ).rejects.toThrow();

      // UserB (requester) tries to approve (should fail - only initiator can approve)
      await expect(
        connectionsApi.approveConnection(supabaseUserB, requestId)
      ).rejects.toThrow();
    });

    it('prevents users from seeing connections between other users', async () => {
      // Create connection between A and B
      await createTestConnection(
        supabaseUserA,
        supabaseUserB,
        testCommunity.id
      );

      // UserC tries to query the connection
      const { data: connectionsForC } = await supabaseUserC
        .from('user_connections')
        .select('*')
        .eq('community_id', testCommunity.id);

      // Should not see any connections (C is not involved in A-B connection)
      expect(connectionsForC).toHaveLength(0);
    });

    it('prevents unauthorized access to connection request details', async () => {
      const { requestId } = await createTestConnectionRequest(
        supabaseUserA,
        supabaseUserB,
        testCommunity.id
      );

      // UserC tries to get details of A-B request
      const { data: requestForC } = await supabaseUserC
        .from('connection_requests')
        .select('*')
        .eq('id', requestId);

      expect(requestForC).toHaveLength(0);
    });
  });

  describe('API Security Enforcement', () => {
    it('fetchUserConnections only returns user connections', async () => {
      // Create connections: A-B and B-C
      const connectionAB = await createTestConnection(
        supabaseUserA,
        supabaseUserB,
        testCommunity.id
      );

      const connectionBC = await createTestConnection(
        supabaseUserB,
        supabaseUserC,
        testCommunity.id
      );

      // UserA fetches connections - should only see A-B
      const connectionsA = await connectionsApi.fetchUserConnections(
        supabaseUserA,
        testCommunity.id
      );

      // UserC fetches connections - should only see B-C
      const connectionsC = await connectionsApi.fetchUserConnections(
        supabaseUserC,
        testCommunity.id
      );

      expect(connectionsA).toHaveLength(1);
      expect(connectionsC).toHaveLength(1);
      expect(connectionsA[0].id).toBe(connectionAB.id);
      expect(connectionsC[0].id).toBe(connectionBC.id);
    });

    it('fetchPendingConnections only returns requests for initiator', async () => {
      // Create request where A is initiator, B is requester
      await createTestConnectionRequest(
        supabaseUserA,
        supabaseUserB,
        testCommunity.id
      );

      // Create request where C is initiator, A is requester
      await createTestConnectionRequest(
        supabaseUserC,
        supabaseUserA,
        testCommunity.id
      );

      // UserA should only see requests where they are initiator (C->A request)
      const pendingForA = await connectionsApi.fetchPendingConnections(
        supabaseUserA,
        testCommunity.id
      );

      // UserB should not see any pending (they are not initiator in any request)
      const pendingForB = await connectionsApi.fetchPendingConnections(
        supabaseUserB,
        testCommunity.id
      );

      expect(pendingForA).toHaveLength(0); // A is not an initiator in our test setup
      expect(pendingForB).toHaveLength(0); // B is not an initiator

      // UserC should see the C->A request
      const pendingForC = await connectionsApi.fetchPendingConnections(
        supabaseUserC,
        testCommunity.id
      );

      expect(pendingForC).toHaveLength(1);
      expect(pendingForC[0].initiatorId).toBe(userC.id);
      expect(pendingForC[0].requesterId).toBe(userA.id);
    });

    it('getMemberConnectionCode only returns user own code', async () => {
      const codeA = await connectionsApi.getMemberConnectionCode(
        supabaseUserA,
        testCommunity.id
      );

      const codeB = await connectionsApi.getMemberConnectionCode(
        supabaseUserB,
        testCommunity.id
      );

      expect(codeA.userId).toBe(userA.id);
      expect(codeB.userId).toBe(userB.id);
      expect(codeA.code).not.toBe(codeB.code);
    });
  });
});