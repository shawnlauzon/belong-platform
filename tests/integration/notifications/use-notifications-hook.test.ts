import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import { createTestUser, createTestCommunity, createTestResource } from '../helpers/test-data';
import { signIn } from '@/features/auth/api';
import { createShoutout } from '@/features/shoutouts/api';
import { joinCommunity } from '@/features/communities/api';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import { ClientContext } from '@/config/BelongProvider';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';

describe('test_int_useNotifications Hook', () => {
  let clientA: SupabaseClient<Database>;
  let clientB: SupabaseClient<Database>;
  let testUser: Account;
  let anotherUser: Account;
  let testCommunity: any;
  let queryClient: QueryClient;

  beforeAll(async () => {
    clientA = createTestClient();
    clientB = createTestClient();
    
    // Create test users - testUser will receive notifications
    testUser = await createTestUser(clientA);
    testCommunity = await createTestCommunity(clientA);
    
    anotherUser = await createTestUser(clientB);
    await joinCommunity(clientB, testCommunity.id);
    
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  afterAll(async () => {
    await cleanupAllTestData(clientA);
    queryClient.clear();
  });

  beforeEach(async () => {
    // Sign in as testUser who will receive notifications
    await signIn(clientA, testUser.email, 'TestPass123!');
  });

  it('should fetch notifications for current user', async () => {
    // Arrange: Create a resource and have anotherUser give testUser a shoutout
    const resource = await createTestResource(
      clientA,
      testCommunity.id,
      'offer',
    );
    
    await signIn(clientB, anotherUser.email, 'TestPass123!');
    
    await createShoutout(clientB, {
      receiverId: testUser.id,
      message: 'Great job on the community project!',
      resourceId: resource.id,
      communityId: testCommunity.id,
    });

    // Switch back to testUser to fetch their notifications
    await signIn(clientA, testUser.email, 'TestPass123!');

    // Act: Render the hook with our authenticated test client
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      React.createElement(QueryClientProvider, { client: queryClient },
        React.createElement(ClientContext.Provider, {
          value: { supabase: clientA, mapbox: null }
        }, children)
      )
    );

    const { result } = renderHook(() => useNotifications(), { wrapper });

    // Wait for the hook to load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 5000 });

    // Assert: Verify the hook returns the expected structure and data
    expect(result.current).toMatchObject({
      data: expect.any(Array),
      isLoading: false,
      hasMore: expect.any(Boolean),
      fetchNextPage: expect.any(Function),
      isFetchingNextPage: false,
      error: null,
    });

    // Verify that we have at least one notification (the shoutout we created)
    expect(result.current.data.length).toBeGreaterThan(0);
    
    // Find the shoutout notification we just created
    const shoutoutNotification = result.current.data.find(n => n.type === 'shoutout_received');
    expect(shoutoutNotification).toBeDefined();
    
    // Verify the notification structure
    expect(shoutoutNotification).toMatchObject({
      id: expect.any(String),
      type: 'shoutout_received',
      title: expect.any(String),
      isRead: false,
      createdAt: expect.any(Date),
      actorId: anotherUser.id,
    });
  });
});