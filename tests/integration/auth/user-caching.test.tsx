import React from 'react';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import { createTestUser } from '../helpers/test-data';
import { ClientContext } from '@/config';
import { createMapboxClient } from '@/config/mapbox';
import { useCurrentUser } from '@/features/auth';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';
import type { BelongClient } from '@/config/client';

describe('User Caching - Integration Tests', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: User;

  beforeAll(async () => {
    supabase = createTestClient();
    testUser = await createTestUser(supabase);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('useCurrentUser hook caching behavior', () => {
    it('should demonstrate excessive API calls when multiple components use useCurrentUser', async () => {
      // Sign in the test user first to ensure authentication
      await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: 'TestPass123!', // This is the password used in createTestUser
      });

      // Spy on fetchUserById to count actual database calls
      const fetchUserSpy = vi.spyOn(await import('@/features/users/api/fetchUserById'), 'fetchUserById');

      // Create components that each use the useCurrentUser hook
      const TestComponent = ({ testId }: { testId: string }) => {
        const { data: currentUser, isLoading, error } = useCurrentUser();
        
        if (isLoading) return <div data-testid={`loading-${testId}`}>Loading...</div>;
        if (error) return <div data-testid={`error-${testId}`}>Error</div>;
        if (!currentUser) return <div data-testid={`no-user-${testId}`}>No user</div>;
        
        return <div data-testid={`user-${testId}`}>{currentUser.id}</div>;
      };

      // Create QueryClient and BelongClient with authenticated supabase
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      // Create BelongClient with our authenticated supabase instance
      const belongClient: BelongClient = {
        supabase,
        mapbox: createMapboxClient('test-token'),
      };

      // Render 7 components simultaneously - simulating the feed scenario
      render(
        <QueryClientProvider client={queryClient}>
          <ClientContext.Provider value={belongClient}>
            <TestComponent testId="1" />
            <TestComponent testId="2" />
            <TestComponent testId="3" />
            <TestComponent testId="4" />
            <TestComponent testId="5" />
            <TestComponent testId="6" />
            <TestComponent testId="7" />
          </ClientContext.Provider>
        </QueryClientProvider>
      );

      // Wait for all components to finish loading and display user data
      await waitFor(
        () => {
          // Check that all 7 user elements exist
          screen.getByTestId('user-1');
          screen.getByTestId('user-2');
          screen.getByTestId('user-3');
          screen.getByTestId('user-4');
          screen.getByTestId('user-5');
          screen.getByTestId('user-6');
          screen.getByTestId('user-7');
        },
        { timeout: 10000 }
      );

      // Verify all components display the same user ID
      const userElements = [
        screen.getByTestId('user-1'),
        screen.getByTestId('user-2'),
        screen.getByTestId('user-3'),
        screen.getByTestId('user-4'),
        screen.getByTestId('user-5'),
        screen.getByTestId('user-6'),
        screen.getByTestId('user-7'),
      ];

      userElements.forEach(element => {
        expect(element.textContent).toBe(testUser.id);
      });

      // Check how many times fetchUserById was actually called
      console.log('fetchUserSpy call count:', fetchUserSpy.mock.calls.length);
      console.log('fetchUserSpy calls:', fetchUserSpy.mock.calls);

      // This is the critical assertion that will FAIL and demonstrate the problem:
      // useCurrentUser should only call fetchUserById ONCE due to React Query caching,
      // but due to function reference instability, it calls it 7 times (once per component)
      expect(fetchUserSpy).toHaveBeenCalledTimes(1);
      expect(fetchUserSpy).toHaveBeenCalledWith(supabase, testUser.id);

      fetchUserSpy.mockRestore();
    });
  });
});