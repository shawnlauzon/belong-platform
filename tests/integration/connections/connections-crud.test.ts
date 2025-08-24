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
import { generateConnectionCode, isValidConnectionCode } from '@/features/connections/utils/codeGenerator';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Community } from '@/features/communities';
import type { User } from '@/features/users';

describe('Connections API - CRUD Operations', () => {
  let supabaseUserA: SupabaseClient<Database>;
  let supabaseUserB: SupabaseClient<Database>;
  let userA: User;
  let userB: User;
  let testCommunity: Community;

  beforeAll(async () => {
    // Create test users and community
    supabaseUserA = createTestClient();
    supabaseUserB = createTestClient();

    userA = await createTestUser(supabaseUserA);
    await signIn(supabaseUserA, userA.email, 'TestPass123!');

    userB = await createTestUser(supabaseUserB);
    await signIn(supabaseUserB, userB.email, 'TestPass123!');

    // Create community as userA (becomes organizer)
    testCommunity = await createTestCommunity(supabaseUserA);

    // UserB joins the community
    await joinCommunity(supabaseUserB, testCommunity.id);
    
    // Wait for triggers to complete
    await new Promise(resolve => setTimeout(resolve, 200));
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  beforeEach(async () => {
    // Clean up connections between tests
    await cleanupCommunityConnections(testCommunity.id);
  });

  describe('Member Connection Codes', () => {
    it('auto-generates connection code when user joins community', async () => {
      // Check that both users have connection codes (auto-generated on join)
      const { data: codeA } = await supabaseUserA
        .from('community_member_codes')
        .select('*')
        .eq('user_id', userA.id)
        .eq('community_id', testCommunity.id)
        .single();

      const { data: codeB } = await supabaseUserB
        .from('community_member_codes')
        .select('*')
        .eq('user_id', userB.id)
        .eq('community_id', testCommunity.id)
        .single();

      expect(codeA).toBeTruthy();
      expect(codeB).toBeTruthy();
      expect(codeA!.code).toHaveLength(8);
      expect(codeB!.code).toHaveLength(8);
      expect(isValidConnectionCode(codeA!.code)).toBe(true);
      expect(isValidConnectionCode(codeB!.code)).toBe(true);
      expect(codeA!.code).not.toBe(codeB!.code); // Codes should be unique
    });

    it('retrieves existing member connection code', async () => {
      const memberCode = await connectionsApi.getMemberConnectionCode(
        supabaseUserA,
        testCommunity.id
      );

      expect(memberCode).toBeTruthy();
      expect(memberCode.code).toHaveLength(8);
      expect(memberCode.userId).toBe(userA.id);
      expect(memberCode.communityId).toBe(testCommunity.id);
      expect(memberCode.isActive).toBe(true);
      expect(memberCode.createdAt).toBeInstanceOf(Date);
      expect(memberCode.updatedAt).toBeInstanceOf(Date);
      expect(isValidConnectionCode(memberCode.code)).toBe(true);
    });

    it('returns same code on subsequent calls', async () => {
      const code1 = await connectionsApi.getMemberConnectionCode(
        supabaseUserA,
        testCommunity.id
      );
      
      const code2 = await connectionsApi.getMemberConnectionCode(
        supabaseUserA,
        testCommunity.id
      );

      expect(code1.code).toBe(code2.code);
      expect(code1.createdAt).toEqual(code2.createdAt);
    });

    it('generates unique codes for different users', async () => {
      const codeA = await connectionsApi.getMemberConnectionCode(
        supabaseUserA,
        testCommunity.id
      );
      
      const codeB = await connectionsApi.getMemberConnectionCode(
        supabaseUserB,
        testCommunity.id
      );

      expect(codeA.code).not.toBe(codeB.code);
      expect(codeA.userId).toBe(userA.id);
      expect(codeB.userId).toBe(userB.id);
    });

    it('regenerates member connection code', async () => {
      const originalCode = await connectionsApi.getMemberConnectionCode(
        supabaseUserA,
        testCommunity.id
      );

      const newCode = await connectionsApi.regenerateMemberCode(
        supabaseUserA,
        testCommunity.id
      );

      expect(newCode.code).not.toBe(originalCode.code);
      expect(newCode.userId).toBe(userA.id);
      expect(newCode.communityId).toBe(testCommunity.id);
      expect(newCode.isActive).toBe(true);
      expect(isValidConnectionCode(newCode.code)).toBe(true);
      
      // Original code should be inactive
      const { data: oldCodeData } = await supabaseUserA
        .from('community_member_codes')
        .select('is_active')
        .eq('code', originalCode.code)
        .single();
      
      expect(oldCodeData?.is_active).toBe(false);
    });
  });

  describe('Connection Request Processing', () => {
    it('creates connection request when processing valid code', async () => {
      const memberCodeA = await createTestMemberConnectionCode(supabaseUserA, testCommunity.id);
      
      const response = await connectionsApi.processConnectionLink(
        supabaseUserB,
        memberCodeA.code
      );

      expect(response.success).toBe(true);
      expect(response.connectionRequestId).toBeTruthy();
      expect(response.message).toContain('successfully');
      
      // Verify request was created in database
      const { data: request } = await supabaseUserA
        .from('connection_requests')
        .select('*')
        .eq('id', response.connectionRequestId!)
        .single();
        
      expect(request).toBeTruthy();
      expect(request!.initiator_id).toBe(userA.id);
      expect(request!.requester_id).toBe(userB.id);
      expect(request!.community_id).toBe(testCommunity.id);
      expect(request!.status).toBe('pending');
    });

    it('rejects invalid connection code', async () => {
      const invalidCode = 'INVALID1';
      
      const response = await connectionsApi.processConnectionLink(
        supabaseUserB,
        invalidCode
      );

      expect(response.success).toBe(false);
      expect(response.message).toContain('Invalid connection code format');
    });

    it('rejects non-existent connection code', async () => {
      const nonExistentCode = generateConnectionCode();
      
      const response = await connectionsApi.processConnectionLink(
        supabaseUserB,
        nonExistentCode
      );

      expect(response.success).toBe(false);
      expect(response.message).toContain('not found');
    });

    it('prevents self-connection attempts', async () => {
      const memberCode = await createTestMemberConnectionCode(supabaseUserA, testCommunity.id);
      
      const response = await connectionsApi.processConnectionLink(
        supabaseUserA,
        memberCode.code
      );

      expect(response.success).toBe(false);
      expect(response.message).toContain('Cannot create connection with yourself');
    });

    it('handles duplicate connection requests', async () => {
      const memberCodeA = await createTestMemberConnectionCode(supabaseUserA, testCommunity.id);
      
      // First request
      const response1 = await connectionsApi.processConnectionLink(
        supabaseUserB,
        memberCodeA.code
      );
      
      // Second request with same code
      const response2 = await connectionsApi.processConnectionLink(
        supabaseUserB,
        memberCodeA.code
      );

      expect(response1.success).toBe(true);
      expect(response2.success).toBe(true);
      expect(response2.message).toContain('already pending');
      expect(response1.connectionRequestId).toBe(response2.connectionRequestId);
    });

    it('requires community membership before connecting', async () => {
      // Create a third user who is not a member
      const supabaseUserC = createTestClient();
      const userC = await createTestUser(supabaseUserC);
      await signIn(supabaseUserC, userC.email, 'TestPass123!');

      const memberCodeA = await createTestMemberConnectionCode(supabaseUserA, testCommunity.id);
      
      const response = await connectionsApi.processConnectionLink(
        supabaseUserC,
        memberCodeA.code
      );

      expect(response.success).toBe(false);
      expect(response.requiresJoinCommunity).toBe(true);
      expect(response.communityId).toBe(testCommunity.id);
      expect(response.communityName).toBe(testCommunity.name);
      expect(response.message).toContain('must join this community');
    });
  });

  describe('Connection Approval and Rejection', () => {
    it('approves connection request successfully', async () => {
      const { requestId } = await createTestConnectionRequest(
        supabaseUserA,
        supabaseUserB,
        testCommunity.id
      );

      const connection = await connectionsApi.approveConnection(
        supabaseUserA,
        requestId
      );

      expect(connection).toBeTruthy();
      expect(connection.id).toBeTruthy();
      expect(connection.communityId).toBe(testCommunity.id);
      expect(connection.connectionRequestId).toBe(requestId);
      
      // Check that users are properly ordered (smaller ID first)
      const expectedUserA = userA.id < userB.id ? userA.id : userB.id;
      const expectedUserB = userA.id < userB.id ? userB.id : userA.id;
      expect(connection.userAId).toBe(expectedUserA);
      expect(connection.userBId).toBe(expectedUserB);

      // Verify request status was updated
      const { data: request } = await supabaseUserA
        .from('connection_requests')
        .select('status, responded_at')
        .eq('id', requestId)
        .single();
        
      expect(request!.status).toBe('accepted');
      expect(request!.responded_at).toBeTruthy();
    });

    it('rejects connection request successfully', async () => {
      const { requestId } = await createTestConnectionRequest(
        supabaseUserA,
        supabaseUserB,
        testCommunity.id
      );

      await connectionsApi.rejectConnection(supabaseUserA, requestId);

      // Verify request status was updated
      const { data: request } = await supabaseUserA
        .from('connection_requests')
        .select('status, responded_at')
        .eq('id', requestId)
        .single();
        
      expect(request!.status).toBe('rejected');
      expect(request!.responded_at).toBeTruthy();

      // Verify no connection was created
      const { data: connections } = await supabaseUserA
        .from('user_connections')
        .select('*')
        .eq('connection_request_id', requestId);
        
      expect(connections).toHaveLength(0);
    });

    it('prevents non-initiator from approving request', async () => {
      const { requestId } = await createTestConnectionRequest(
        supabaseUserA,
        supabaseUserB,
        testCommunity.id
      );

      // UserB tries to approve (but they're the requester, not initiator)
      await expect(
        connectionsApi.approveConnection(supabaseUserB, requestId)
      ).rejects.toThrow();
    });

    it('prevents non-initiator from rejecting request', async () => {
      const { requestId } = await createTestConnectionRequest(
        supabaseUserA,
        supabaseUserB,
        testCommunity.id
      );

      // UserB tries to reject (but they're the requester, not initiator)
      await expect(
        connectionsApi.rejectConnection(supabaseUserB, requestId)
      ).rejects.toThrow();
    });

    it('prevents duplicate connections', async () => {
      // Create and approve first connection
      const connection = await createTestConnection(
        supabaseUserA,
        supabaseUserB,
        testCommunity.id
      );

      expect(connection).toBeTruthy();

      // Try to create another connection request between same users
      const memberCodeB = await createTestMemberConnectionCode(supabaseUserB, testCommunity.id);
      
      const response = await connectionsApi.processConnectionLink(
        supabaseUserA,
        memberCodeB.code
      );

      expect(response.success).toBe(true);
      expect(response.message).toContain('already established');
    });
  });

  describe('Connection Data Validation', () => {
    it('ensures proper user ordering in connections table', async () => {
      const connection = await createTestConnection(
        supabaseUserA,
        supabaseUserB,
        testCommunity.id
      );

      // Verify user_a_id < user_b_id constraint is maintained
      expect(connection.userAId < connection.userBId).toBe(true);
      
      // Direct database check
      const { data: dbConnection } = await supabaseUserA
        .from('user_connections')
        .select('*')
        .eq('id', connection.id)
        .single();
        
      expect(dbConnection!.user_a_id < dbConnection!.user_b_id).toBe(true);
    });

    it('creates connections with proper timestamps', async () => {
      const beforeTime = new Date();
      
      const connection = await createTestConnection(
        supabaseUserA,
        supabaseUserB,
        testCommunity.id
      );
      
      const afterTime = new Date();

      expect(connection.createdAt).toBeInstanceOf(Date);
      expect(connection.createdAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(connection.createdAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('maintains referential integrity', async () => {
      const { requestId } = await createTestConnectionRequest(
        supabaseUserA,
        supabaseUserB,
        testCommunity.id
      );

      const connection = await connectionsApi.approveConnection(
        supabaseUserA,
        requestId
      );

      // Verify all foreign keys are properly set
      expect(connection.userAId).toBeTruthy();
      expect(connection.userBId).toBeTruthy();
      expect(connection.communityId).toBe(testCommunity.id);
      expect(connection.connectionRequestId).toBe(requestId);

      // Verify referenced records exist
      const { data: userAProfile } = await supabaseUserA
        .from('profiles')
        .select('id')
        .eq('id', connection.userAId)
        .single();
        
      const { data: userBProfile } = await supabaseUserA
        .from('profiles')
        .select('id')
        .eq('id', connection.userBId)
        .single();
        
      const { data: community } = await supabaseUserA
        .from('communities')
        .select('id')
        .eq('id', connection.communityId)
        .single();
        
      expect(userAProfile).toBeTruthy();
      expect(userBProfile).toBeTruthy();
      expect(community).toBeTruthy();
    });
  });
});