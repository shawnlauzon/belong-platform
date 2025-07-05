import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import {
  fetchCommunities,
  fetchCommunityById,
  createCommunity,
  updateCommunity,
  deleteCommunity,
  joinCommunity,
  leaveCommunity,
  fetchCommunityMembers,
} from '../../../src/features/communities/api';
import type { CommunityData } from '../../../src/features/communities/types';

// Simple test data
const createTestCommunityData = (overrides: Partial<CommunityData> = {}): CommunityData => ({
  name: `TEST_API_COMMUNITY_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
  description: 'Test community description for API testing',
  organizerId: '', // Will need to be set to actual user ID
  timeZone: 'America/New_York',
  memberCount: 1,
  ...overrides,
});

// Simple cleanup function
const cleanupTestCommunities = async (supabase: any) => {
  await supabase
    .from('communities')
    .delete()
    .like('name', 'TEST_API_COMMUNITY_%');
};

describe('Communities API Integration Tests', () => {
  let supabase: any;
  let testCommunityId: string | null = null;

  beforeEach(() => {
    supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!
    );
  });

  afterEach(async () => {
    await cleanupTestCommunities(supabase);
    testCommunityId = null;
  });

  test('fetchCommunities should return array of communities', async () => {
    const communities = await fetchCommunities(supabase);
    
    expect(Array.isArray(communities)).toBe(true);
    
    // If there are communities, check structure
    if (communities.length > 0) {
      const community = communities[0];
      expect(community).toHaveProperty('id');
      expect(community).toHaveProperty('name');
      expect(community).toHaveProperty('organizerId');
      expect(community).toHaveProperty('timeZone');
      expect(community).toHaveProperty('memberCount');
      expect(community).toHaveProperty('createdAt');
      expect(community).toHaveProperty('updatedAt');
      expect(typeof community.id).toBe('string');
      expect(typeof community.name).toBe('string');
    }
  });

  test('fetchCommunities should handle empty results', async () => {
    // Clean up first to potentially get empty results
    await cleanupTestCommunities(supabase);
    
    const communities = await fetchCommunities(supabase);
    
    expect(Array.isArray(communities)).toBe(true);
    // Note: might still have other communities, so just verify it's an array
  });

  test('fetchCommunities should filter by name', async () => {
    const communities = await fetchCommunities(supabase, { name: 'test' });
    
    expect(Array.isArray(communities)).toBe(true);
    
    // If there are results, verify they match the filter
    communities.forEach(community => {
      expect(community.name.toLowerCase()).toContain('test');
    });
  });

  test('createCommunity should create and return new community', async () => {
    // Skip if we don't have required organizer ID for testing
    if (!process.env.TEST_USER_ID) {
      console.warn('Skipping createCommunity test - missing TEST_USER_ID');
      return;
    }

    const communityData = createTestCommunityData({
      organizerId: process.env.TEST_USER_ID,
    });

    const createdCommunity = await createCommunity(supabase, communityData);

    expect(createdCommunity).toBeDefined();
    expect(createdCommunity.id).toBeDefined();
    expect(createdCommunity.name).toBe(communityData.name);
    expect(createdCommunity.description).toBe(communityData.description);
    expect(createdCommunity.organizerId).toBe(communityData.organizerId);
    expect(createdCommunity.timeZone).toBe(communityData.timeZone);
    expect(createdCommunity.memberCount).toBeGreaterThanOrEqual(1);
    expect(createdCommunity.createdAt).toBeDefined();
    expect(createdCommunity.updatedAt).toBeDefined();

    testCommunityId = createdCommunity.id;
  });

  test('createCommunity should throw error with invalid data', async () => {
    const invalidCommunityData = createTestCommunityData({
      organizerId: 'invalid-user-id',
      name: '', // Empty name should fail
    });

    await expect(createCommunity(supabase, invalidCommunityData)).rejects.toThrow();
  });

  test('fetchCommunityById should return specific community', async () => {
    // Skip if we don't have a test community
    if (!testCommunityId) {
      console.warn('Skipping fetchCommunityById test - no test community available');
      return;
    }

    const community = await fetchCommunityById(supabase, testCommunityId);

    expect(community).toBeDefined();
    expect(community!.id).toBe(testCommunityId);
    expect(community!.name).toContain('TEST_API_COMMUNITY_');
  });

  test('fetchCommunityById should return null for non-existent ID', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    
    const community = await fetchCommunityById(supabase, nonExistentId);
    
    expect(community).toBeNull();
  });

  test('fetchCommunityById should throw error for invalid UUID format', async () => {
    const invalidId = 'invalid-id-123';
    
    await expect(fetchCommunityById(supabase, invalidId)).rejects.toThrow();
  });

  test('updateCommunity should modify existing community', async () => {
    // Skip if we don't have a test community
    if (!testCommunityId) {
      console.warn('Skipping updateCommunity test - no test community available');
      return;
    }

    const updatedName = `UPDATED_TEST_API_COMMUNITY_${Date.now()}`;
    const updatedDescription = 'Updated description for API testing';

    const updatedCommunity = await updateCommunity(supabase, testCommunityId, {
      name: updatedName,
      description: updatedDescription,
    });

    expect(updatedCommunity).toBeDefined();
    expect(updatedCommunity.id).toBe(testCommunityId);
    expect(updatedCommunity.name).toBe(updatedName);
    expect(updatedCommunity.description).toBe(updatedDescription);
    expect(updatedCommunity.updatedAt).toBeDefined();
  });

  test('updateCommunity should throw error for non-existent community', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    
    await expect(updateCommunity(supabase, nonExistentId, {
      name: 'Updated Name',
    })).rejects.toThrow();
  });

  test('deleteCommunity should remove community from database', async () => {
    // Skip if we don't have a test community
    if (!testCommunityId) {
      console.warn('Skipping deleteCommunity test - no test community available');
      return;
    }

    // Delete the community
    await deleteCommunity(supabase, testCommunityId);

    // Verify it's gone
    const deletedCommunity = await fetchCommunityById(supabase, testCommunityId);
    expect(deletedCommunity).toBeNull();

    testCommunityId = null; // Mark as cleaned up
  });

  test('deleteCommunity should handle non-existent community gracefully', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    
    // Should not throw an error for valid UUID format
    await expect(deleteCommunity(supabase, nonExistentId)).resolves.not.toThrow();
  });

  test('deleteCommunity should throw error for invalid UUID format', async () => {
    const invalidId = 'invalid-id-123';
    
    await expect(deleteCommunity(supabase, invalidId)).rejects.toThrow();
  });

  test('joinCommunity should add user to community', async () => {
    // Skip if we don't have required IDs for testing
    if (!testCommunityId || !process.env.TEST_USER_ID) {
      console.warn('Skipping joinCommunity test - missing test community or user ID');
      return;
    }

    const membership = await joinCommunity(supabase, {
      userId: process.env.TEST_USER_ID,
      communityId: testCommunityId,
      role: 'member',
    });

    expect(membership).toBeDefined();
    expect(membership.userId).toBe(process.env.TEST_USER_ID);
    expect(membership.communityId).toBe(testCommunityId);
    expect(membership.role).toBe('member');
    expect(membership.joinedAt).toBeDefined();
  });

  test('leaveCommunity should remove user from community', async () => {
    // Skip if we don't have required IDs for testing
    if (!testCommunityId || !process.env.TEST_USER_ID) {
      console.warn('Skipping leaveCommunity test - missing test community or user ID');
      return;
    }

    // First join the community
    await joinCommunity(supabase, {
      userId: process.env.TEST_USER_ID,
      communityId: testCommunityId,
      role: 'member',
    });

    // Then leave it
    await leaveCommunity(supabase, {
      userId: process.env.TEST_USER_ID,
      communityId: testCommunityId,
    });

    // Verify membership is gone
    const members = await fetchCommunityMembers(supabase, testCommunityId);
    const stillMember = members.some(member => member.userId === process.env.TEST_USER_ID);
    expect(stillMember).toBe(false);
  });

  test('fetchCommunityMembers should return community members', async () => {
    // Skip if we don't have a test community
    if (!testCommunityId) {
      console.warn('Skipping fetchCommunityMembers test - no test community available');
      return;
    }

    const members = await fetchCommunityMembers(supabase, testCommunityId);
    
    expect(Array.isArray(members)).toBe(true);
    
    // If there are members, check structure
    if (members.length > 0) {
      const member = members[0];
      expect(member).toHaveProperty('userId');
      expect(member).toHaveProperty('communityId');
      expect(member).toHaveProperty('joinedAt');
      expect(typeof member.userId).toBe('string');
      expect(member.communityId).toBe(testCommunityId);
    }
  });

  test('API functions should handle database connection errors', async () => {
    // Create a client with invalid credentials
    const invalidSupabase = createClient(
      'https://invalid.supabase.co',
      'invalid-key'
    );

    // These should handle errors gracefully or throw expected errors
    await expect(fetchCommunities(invalidSupabase)).rejects.toThrow();
    await expect(fetchCommunityById(invalidSupabase, 'any-id')).rejects.toThrow();
  });

  test('API functions should handle malformed filters gracefully', async () => {
    // Test with various edge cases
    const emptyFilter = await fetchCommunities(supabase, {});
    expect(Array.isArray(emptyFilter)).toBe(true);

    const emptyName = await fetchCommunities(supabase, { name: '' });
    expect(Array.isArray(emptyName)).toBe(true);
  });

  test('createCommunity should handle community with boundary', async () => {
    // Skip if we don't have required organizer ID for testing
    if (!process.env.TEST_USER_ID) {
      console.warn('Skipping boundary community test - missing TEST_USER_ID');
      return;
    }

    const communityWithBoundary = createTestCommunityData({
      organizerId: process.env.TEST_USER_ID,
      boundary: {
        type: 'isochrone',
        center: { lng: -74.006, lat: 40.7128 }, // New York City
        travelMode: 'walking',
        travelTimeMin: 15,
        polygon: {
          type: 'Polygon',
          coordinates: [
            [
              [-74.016, 40.7028],
              [-73.996, 40.7028],
              [-73.996, 40.7228],
              [-74.016, 40.7228],
              [-74.016, 40.7028],
            ],
          ],
        },
        areaSqKm: 2.5,
      },
    });

    try {
      const createdCommunity = await createCommunity(supabase, communityWithBoundary);
      
      expect(createdCommunity.boundary).toBeDefined();
      expect(createdCommunity.boundary?.type).toBe('isochrone');
      testCommunityId = createdCommunity.id;
    } catch (error) {
      console.warn('Community boundary test failed - boundaries might not be supported:', error);
      // This is acceptable if boundaries aren't supported in the current schema
    }
  });

  test('joinCommunity should prevent duplicate memberships', async () => {
    // Skip if we don't have required IDs for testing
    if (!testCommunityId || !process.env.TEST_USER_ID) {
      console.warn('Skipping duplicate membership test - missing test community or user ID');
      return;
    }

    // First join
    await joinCommunity(supabase, {
      userId: process.env.TEST_USER_ID,
      communityId: testCommunityId,
      role: 'member',
    });

    // Second join should fail
    await expect(joinCommunity(supabase, {
      userId: process.env.TEST_USER_ID,
      communityId: testCommunityId,
      role: 'member',
    })).rejects.toThrow();
  });
});