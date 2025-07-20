import React from 'react';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import { createTestUser } from '../helpers/test-data';
import { ClientContext } from '@/config';
import { createMapboxClient } from '@/config/mapbox';
import { useUser } from '@/features/users';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';
import type { BelongClient } from '@/config/client';

describe('useUser Caching - Integration Tests', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: User;

  beforeAll(async () => {
    supabase = createTestClient();
    testUser = await createTestUser(supabase);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('useUser function reference instability issue', () => {
    it('should demonstrate excessive API calls when multiple components use useUser with same ID', async () => {
      // Sign in the test user first to ensure authentication
      await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: 'TestPass123!',
      });

      // Spy on fetchUserById to count actual database calls
      const fetchUserSpy = vi.spyOn(await import('@/features/users/api/fetchUserById'), 'fetchUserById');

      // Create components that each use the useUser hook WITH THE SAME USER ID
      // Force each component to create a NEW function reference by capturing different props
      const TestComponent = ({ testId, extraProp }: { testId: string; extraProp: number }) => {
        // This will cause each component to have a different closure even with same userId
        const { data: user, isLoading, error } = useUser(testUser.id);
        
        if (isLoading) return <div data-testid={`loading-${testId}`}>Loading {extraProp}...</div>;
        if (error) return <div data-testid={`error-${testId}`}>Error</div>;
        if (!user) return <div data-testid={`no-user-${testId}`}>No user</div>;
        
        return <div data-testid={`user-${testId}`}>{user.id}</div>;
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
      // ALL COMPONENTS REQUEST THE SAME USER ID but have different props
      render(
        <QueryClientProvider client={queryClient}>
          <ClientContext.Provider value={belongClient}>
            <TestComponent testId="1" extraProp={1} />
            <TestComponent testId="2" extraProp={2} />
            <TestComponent testId="3" extraProp={3} />
            <TestComponent testId="4" extraProp={4} />
            <TestComponent testId="5" extraProp={5} />
            <TestComponent testId="6" extraProp={6} />
            <TestComponent testId="7" extraProp={7} />
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
      console.log('fetchUserSpy calls:', fetchUserSpy.mock.calls.map(call => call[1])); // Log the user IDs

      // This assertion will FAIL initially, demonstrating the problem:
      // With function reference instability, each useUser call creates a different queryFn,
      // causing React Query to treat them as different queries despite same query key
      expect(fetchUserSpy).toHaveBeenCalledTimes(1);
      expect(fetchUserSpy).toHaveBeenCalledWith(supabase, testUser.id);

      fetchUserSpy.mockRestore();
    });

    it('should demonstrate that different user IDs are cached correctly', async () => {
      // This test verifies that the caching DOES work when user IDs are actually different
      
      const fetchUserSpy = vi.spyOn(await import('@/features/users/api/fetchUserById'), 'fetchUserById');

      // Create a second test user
      const testUser2 = await createTestUser(supabase);

      const TestComponent = ({ userId, testId }: { userId: string; testId: string }) => {
        const { data: user, isLoading } = useUser(userId);
        
        if (isLoading) return <div data-testid={`loading-${testId}`}>Loading...</div>;
        if (!user) return <div data-testid={`no-user-${testId}`}>No user</div>;
        
        return <div data-testid={`user-${testId}`}>{user.id}</div>;
      };

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const belongClient: BelongClient = {
        supabase,
        mapbox: createMapboxClient('test-token'),
      };

      // Render components with DIFFERENT user IDs
      render(
        <QueryClientProvider client={queryClient}>
          <ClientContext.Provider value={belongClient}>
            <TestComponent userId={testUser.id} testId="1" />
            <TestComponent userId={testUser2.id} testId="2" />
            <TestComponent userId={testUser.id} testId="3" />  {/* Same as first */}
            <TestComponent userId={testUser2.id} testId="4" /> {/* Same as second */}
          </ClientContext.Provider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        screen.getByTestId('user-1');
        screen.getByTestId('user-2');
        screen.getByTestId('user-3');
        screen.getByTestId('user-4');
      });

      // Should only be called twice (once for each unique user ID)
      // This test should pass even before the fix, confirming our understanding
      expect(fetchUserSpy).toHaveBeenCalledTimes(2);

      fetchUserSpy.mockRestore();
    });
  });
});