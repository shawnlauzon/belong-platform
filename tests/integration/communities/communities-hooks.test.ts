import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';
import React from 'react';
import {
  useCommunities,
  useCommunity,
  useCreateCommunity,
  useUpdateCommunity,
  useDeleteCommunity,
  useJoinCommunity,
  useLeaveCommunity,
  useCommunityMembers,
  BelongProvider,
} from '../../../src';
import type { CommunityData } from '../../../src/features/communities/types';

// Simple test wrapper for React Query and BelongProvider
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
    logger: { log: () => {}, warn: () => {}, error: () => {} },
  });

  const config = {
    supabaseUrl: process.env.VITE_SUPABASE_URL!,
    supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY!,
    mapboxPublicToken: process.env.VITE_MAPBOX_PUBLIC_TOKEN!,
  };

  return ({ children }: { children: React.ReactNode }) => 
    React.createElement(
      QueryClientProvider, 
      { client: queryClient },
      React.createElement(BelongProvider, { config }, children)
    );
};

// Simple test data
const createTestCommunityData = (overrides: Partial<CommunityData> = {}): CommunityData => ({
  name: `TEST_HOOK_COMMUNITY_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
  description: 'Test community description for hooks testing',
  organizerId: process.env.TEST_USER_ID || '',
  timeZone: 'America/New_York',
  memberCount: 1,
  ...overrides,
});

// Simple cleanup function
const cleanupTestCommunities = async () => {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
  );
  
  await supabase
    .from('communities')
    .delete()
    .like('name', 'TEST_HOOK_COMMUNITY_%');
};

describe('Communities Hooks Integration Tests', () => {
  let wrapper: ReturnType<typeof createTestWrapper>;
  let testCommunityData: CommunityData;

  beforeEach(() => {
    wrapper = createTestWrapper();
    testCommunityData = createTestCommunityData();
  });

  afterEach(async () => {
    await cleanupTestCommunities();
  });

  test('should fetch communities using useCommunities hook', async () => {
    const { result } = renderHook(() => useCommunities(), { wrapper });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    }, { timeout: 10000 });

    const { data: communities } = result.current;
    expect(Array.isArray(communities)).toBe(true);
    
    // If there are communities, check structure
    if (communities && communities.length > 0) {
      const community = communities[0];
      expect(community).toHaveProperty('id');
      expect(community).toHaveProperty('name');
      expect(community).toHaveProperty('organizerId');
      expect(community).toHaveProperty('timeZone');
      expect(community).toHaveProperty('memberCount');
      expect(community).toHaveProperty('createdAt');
      expect(community).toHaveProperty('updatedAt');
    }
  });

  test('should create community using useCreateCommunity hook', async () => {
    // Skip if we don't have required organizer ID for testing
    if (!process.env.TEST_USER_ID) {
      console.warn('Skipping create community test - missing TEST_USER_ID');
      return;
    }

    const { result } = renderHook(() => useCreateCommunity(), { wrapper });

    // useCreateCommunity returns a function directly
    expect(typeof result.current).toBe('function');

    const createdCommunity = await act(async () => {
      return await result.current(testCommunityData);
    });

    expect(createdCommunity).toBeDefined();
    expect(createdCommunity.id).toBeDefined();
    expect(createdCommunity.name).toBe(testCommunityData.name);
    expect(createdCommunity.description).toBe(testCommunityData.description);
    expect(createdCommunity.organizerId).toBe(testCommunityData.organizerId);
    expect(createdCommunity.timeZone).toBe(testCommunityData.timeZone);
    expect(createdCommunity.memberCount).toBeGreaterThanOrEqual(1);
    expect(createdCommunity.createdAt).toBeInstanceOf(Date);
    expect(createdCommunity.updatedAt).toBeInstanceOf(Date);
  });

  test('should fetch specific community using useCommunity hook', async () => {
    // Skip if we don't have required organizer ID for testing
    if (!process.env.TEST_USER_ID) {
      console.warn('Skipping fetch community test - missing TEST_USER_ID');
      return;
    }

    // First create a community
    const { result: createResult } = renderHook(() => useCreateCommunity(), { wrapper });
    
    const createdCommunity = await act(async () => {
      return await createResult.current(testCommunityData);
    });

    // Then fetch it by ID
    const { result: fetchResult } = renderHook(() => useCommunity(createdCommunity.id), { wrapper });

    await waitFor(() => {
      expect(fetchResult.current.isPending).toBe(false);
    }, { timeout: 10000 });

    const fetchedCommunity = fetchResult.current.data;
    expect(fetchedCommunity).toBeDefined();
    expect(fetchedCommunity!.id).toBe(createdCommunity.id);
    expect(fetchedCommunity!.name).toBe(testCommunityData.name);
  });

  test('should update community using useUpdateCommunity hook', async () => {
    // Skip if we don't have required organizer ID for testing
    if (!process.env.TEST_USER_ID) {
      console.warn('Skipping update community test - missing TEST_USER_ID');
      return;
    }

    // First create a community
    const { result: createResult } = renderHook(() => useCreateCommunity(), { wrapper });
    
    const createdCommunity = await act(async () => {
      return await createResult.current(testCommunityData);
    });

    // Then update it
    const { result: updateResult } = renderHook(() => useUpdateCommunity(), { wrapper });

    const updatedName = `UPDATED_TEST_HOOK_COMMUNITY_${Date.now()}`;
    const updatedDescription = 'Updated description for hooks testing';

    const updatedCommunity = await act(async () => {
      return await updateResult.current(createdCommunity.id, {
        name: updatedName,
        description: updatedDescription,
      });
    });

    expect(updatedCommunity).toBeDefined();
    expect(updatedCommunity.id).toBe(createdCommunity.id);
    expect(updatedCommunity.name).toBe(updatedName);
    expect(updatedCommunity.description).toBe(updatedDescription);
    expect(updatedCommunity.updatedAt).toBeInstanceOf(Date);
  });

  test('should delete community using useDeleteCommunity hook', async () => {
    // Skip if we don't have required organizer ID for testing
    if (!process.env.TEST_USER_ID) {
      console.warn('Skipping delete community test - missing TEST_USER_ID');
      return;
    }

    // First create a community
    const { result: createResult } = renderHook(() => useCreateCommunity(), { wrapper });
    
    const createdCommunity = await act(async () => {
      return await createResult.current(testCommunityData);
    });

    // Then delete it
    const { result: deleteResult } = renderHook(() => useDeleteCommunity(), { wrapper });

    await act(async () => {
      await deleteResult.current(createdCommunity.id);
    });

    // Verify it's gone by trying to fetch it
    const { result: fetchResult } = renderHook(() => useCommunity(createdCommunity.id), { wrapper });

    await waitFor(() => {
      expect(fetchResult.current.isPending).toBe(false);
    }, { timeout: 10000 });

    expect(fetchResult.current.data).toBeNull();
  });

  test('should join community using useJoinCommunity hook', async () => {
    // Skip if we don't have required IDs for testing
    if (!process.env.TEST_USER_ID) {
      console.warn('Skipping join community test - missing TEST_USER_ID');
      return;
    }

    // First create a community
    const { result: createResult } = renderHook(() => useCreateCommunity(), { wrapper });
    
    const createdCommunity = await act(async () => {
      return await createResult.current(testCommunityData);
    });

    // Then join it
    const { result: joinResult } = renderHook(() => useJoinCommunity(), { wrapper });

    const membership = await act(async () => {
      return await joinResult.current(createdCommunity.id, 'member');
    });

    expect(membership).toBeDefined();
    expect(membership.userId).toBe(process.env.TEST_USER_ID);
    expect(membership.communityId).toBe(createdCommunity.id);
    expect(membership.role).toBe('member');
    expect(membership.joinedAt).toBeInstanceOf(Date);
  });

  test('should leave community using useLeaveCommunity hook', async () => {
    // Skip if we don't have required IDs for testing
    if (!process.env.TEST_USER_ID) {
      console.warn('Skipping leave community test - missing TEST_USER_ID');
      return;
    }

    // First create a community
    const { result: createResult } = renderHook(() => useCreateCommunity(), { wrapper });
    
    const createdCommunity = await act(async () => {
      return await createResult.current(testCommunityData);
    });

    // Join it first
    const { result: joinResult } = renderHook(() => useJoinCommunity(), { wrapper });

    await act(async () => {
      await joinResult.current(createdCommunity.id, 'member');
    });

    // Then leave it
    const { result: leaveResult } = renderHook(() => useLeaveCommunity(), { wrapper });

    await act(async () => {
      await leaveResult.current(createdCommunity.id);
    });

    // Verify membership is gone
    const { result: membersResult } = renderHook(() => useCommunityMembers(createdCommunity.id), { wrapper });

    await waitFor(() => {
      expect(membersResult.current.isPending).toBe(false);
    }, { timeout: 10000 });

    const members = membersResult.current.data;
    expect(Array.isArray(members)).toBe(true);
    
    if (members) {
      const stillMember = members.some(member => member.userId === process.env.TEST_USER_ID);
      expect(stillMember).toBe(false);
    }
  });

  test('should fetch community members using useCommunityMembers hook', async () => {
    // Skip if we don't have required organizer ID for testing
    if (!process.env.TEST_USER_ID) {
      console.warn('Skipping fetch community members test - missing TEST_USER_ID');
      return;
    }

    // First create a community
    const { result: createResult } = renderHook(() => useCreateCommunity(), { wrapper });
    
    const createdCommunity = await act(async () => {
      return await createResult.current(testCommunityData);
    });

    // Then fetch its members
    const { result: membersResult } = renderHook(() => useCommunityMembers(createdCommunity.id), { wrapper });

    await waitFor(() => {
      expect(membersResult.current.isPending).toBe(false);
    }, { timeout: 10000 });

    const members = membersResult.current.data;
    expect(Array.isArray(members)).toBe(true);
    
    // If there are members, check structure
    if (members && members.length > 0) {
      const member = members[0];
      expect(member).toHaveProperty('userId');
      expect(member).toHaveProperty('communityId');
      expect(member).toHaveProperty('joinedAt');
      expect(typeof member.userId).toBe('string');
      expect(member.communityId).toBe(createdCommunity.id);
      expect(member.joinedAt).toBeInstanceOf(Date);
    }
  });

  test('should handle create community with invalid data', async () => {
    const { result } = renderHook(() => useCreateCommunity(), { wrapper });

    const invalidCommunityData = createTestCommunityData({
      organizerId: 'invalid-user-id',
      name: '', // Empty name should fail
    });

    await expect(act(async () => {
      await result.current(invalidCommunityData);
    })).rejects.toThrow();
  });

  test('should handle update non-existent community', async () => {
    const { result } = renderHook(() => useUpdateCommunity(), { wrapper });

    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    await expect(act(async () => {
      await result.current(nonExistentId, { name: 'Updated Name' });
    })).rejects.toThrow();
  });

  test('should handle delete non-existent community', async () => {
    const { result } = renderHook(() => useDeleteCommunity(), { wrapper });

    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    // Should not throw an error for valid UUID format
    await act(async () => {
      await result.current(nonExistentId);
    });
  });

  test('should validate hook signatures', async () => {
    const { result } = renderHook(() => ({
      communities: useCommunities(),
      community: useCommunity('test-id'),
      createCommunity: useCreateCommunity(),
      updateCommunity: useUpdateCommunity(),
      deleteCommunity: useDeleteCommunity(),
      joinCommunity: useJoinCommunity(),
      leaveCommunity: useLeaveCommunity(),
      communityMembers: useCommunityMembers('test-id'),
    }), { wrapper });

    // Query hooks return React Query objects
    expect(result.current.communities).toHaveProperty('data');
    expect(result.current.communities).toHaveProperty('isPending');
    expect(result.current.communities).toHaveProperty('error');
    
    expect(result.current.community).toHaveProperty('data');
    expect(result.current.community).toHaveProperty('isPending');
    expect(result.current.community).toHaveProperty('error');
    
    expect(result.current.communityMembers).toHaveProperty('data');
    expect(result.current.communityMembers).toHaveProperty('isPending');
    expect(result.current.communityMembers).toHaveProperty('error');

    // Mutation hooks return functions directly
    expect(typeof result.current.createCommunity).toBe('function');
    expect(typeof result.current.updateCommunity).toBe('function');
    expect(typeof result.current.deleteCommunity).toBe('function');
    expect(typeof result.current.joinCommunity).toBe('function');
    expect(typeof result.current.leaveCommunity).toBe('function');
  });

  test('should handle communities with filter', async () => {
    const { result } = renderHook(() => useCommunities({ name: 'test' }), { wrapper });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    }, { timeout: 10000 });

    const communities = result.current.data;
    expect(Array.isArray(communities)).toBe(true);
    
    // If there are results, verify they match the filter
    if (communities && communities.length > 0) {
      communities.forEach(community => {
        expect(community.name.toLowerCase()).toContain('test');
      });
    }
  });

  test('should handle fetch non-existent community', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    
    const { result } = renderHook(() => useCommunity(nonExistentId), { wrapper });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    }, { timeout: 10000 });

    expect(result.current.data).toBeNull();
  });

  test('should handle fetch members of non-existent community', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    
    const { result } = renderHook(() => useCommunityMembers(nonExistentId), { wrapper });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    }, { timeout: 10000 });

    const members = result.current.data;
    expect(Array.isArray(members)).toBe(true);
    expect(members).toHaveLength(0);
  });
});