import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { faker } from '@faker-js/faker';
import React from 'react';
import { QueryClient } from '@tanstack/react-query';
import {
  initializeBelong,
  useCommunities,
  useCreateCommunity,
  useUpdateCommunity,
  useDeleteCommunity,
  useSignIn,
  useSignUp,
  resetBelongClient,
} from '@belongnetwork/platform';
import { TestWrapper } from './database/utils/test-wrapper';
import { generateTestName } from './database/utils/database-helpers';

describe('Communities CRUD Integration Tests', () => {
  let testUser: { email: string; password: string; userId?: string };
  let createdCommunityIds: string[] = [];
  let queryClient: QueryClient;

  beforeEach(async () => {
    // Create fresh query client for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
          staleTime: 0,
          refetchOnWindowFocus: false,
          refetchOnMount: true,
          refetchOnReconnect: false,
        },
        mutations: {
          retry: false,
        },
      },
    });

    // Initialize Belong client
    initializeBelong({
      supabaseUrl: process.env.VITE_SUPABASE_URL!,
      supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY!,
      mapboxPublicToken: process.env.VITE_MAPBOX_PUBLIC_TOKEN!,
    });

    // Generate unique test user
    testUser = {
      email: faker.internet.email(),
      password: faker.internet.password({ length: 12 }),
    };

    createdCommunityIds = [];
  });

  afterEach(async () => {
    // Clean up created communities
    if (createdCommunityIds.length > 0) {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
      );

      const { result: deleteResult } = renderHook(() => useDeleteCommunity(), {
        wrapper,
      });

      for (const communityId of createdCommunityIds) {
        await act(async () => {
          deleteResult.current.mutate(communityId);
        });
        
        await waitFor(() => {
          if (deleteResult.current.isError) {
            console.error('Delete community cleanup error:', deleteResult.current.error);
          }
          expect(deleteResult.current).toEqual(
            expect.objectContaining({
              isSuccess: true,
              error: null,
            })
          );
        });
      }
    }

    resetBelongClient();
  });

  test('should successfully read communities without authentication', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
    );

    const { result: communitiesResult } = renderHook(() => useCommunities(), {
      wrapper,
    });

    await waitFor(() => {
      if (communitiesResult.current.isError) {
        console.error('Fetch communities error:', communitiesResult.current.error);
      }
      expect(communitiesResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              name: expect.any(String),
              level: expect.any(String),
              timeZone: expect.any(String),
            })
          ]),
          error: null,
        })
      );
    });
  });

  test('should successfully create a community when authenticated', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
    );

    // Sign up test user
    const { result: signUpResult } = renderHook(() => useSignUp(), {
      wrapper,
    });

    await act(async () => {
      signUpResult.current.mutate({
        email: testUser.email,
        password: testUser.password,
      });
    });

    await waitFor(() => {
      if (signUpResult.current.isError) {
        console.error('Sign up error:', signUpResult.current.error);
      }
      expect(signUpResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.objectContaining({
            user: expect.objectContaining({
              id: expect.any(String),
            }),
          }),
          error: null,
        })
      );
    });
    testUser.userId = signUpResult.current.data?.user?.id;

    // Sign in test user
    const { result: signInResult } = renderHook(() => useSignIn(), {
      wrapper,
    });

    await act(async () => {
      signInResult.current.mutate({
        email: testUser.email,
        password: testUser.password,
      });
    });

    await waitFor(() => {
      if (signInResult.current.isError) {
        console.error('Sign in error:', signInResult.current.error);
      }
      expect(signInResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.objectContaining({
            user: expect.objectContaining({
              id: expect.any(String),
            }),
          }),
          error: null,
        })
      );
    });

    // Create a community
    const { result: createCommunityResult } = renderHook(() => useCreateCommunity(), {
      wrapper,
    });

    const communityData = {
      name: generateTestName('Test Community'),
      description: faker.lorem.paragraph(),
      level: 'neighborhood' as const,
      timeZone: 'America/New_York',
      organizerId: testUser.userId!,
      parentId: null,
      hierarchyPath: [{ level: 'test', name: 'Test' }],
      memberCount: 1,
    };

    await act(async () => {
      createCommunityResult.current.mutate(communityData);
    });

    await waitFor(() => {
      if (createCommunityResult.current.isError) {
        console.error('Create community error:', createCommunityResult.current.error);
      }
      expect(createCommunityResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.objectContaining({
            id: expect.any(String),
            name: communityData.name,
            description: communityData.description,
            level: communityData.level,
            timeZone: communityData.timeZone,
            organizerId: testUser.userId,
          }),
          error: null,
        })
      );
    });
    
    // Track for cleanup
    createdCommunityIds.push(createCommunityResult.current.data!.id);

    // Verify community appears in communities list
    const { result: communitiesResult } = renderHook(() => useCommunities(), {
      wrapper,
    });

    await waitFor(() => {
      if (communitiesResult.current.isError) {
        console.error('Fetch communities list error:', communitiesResult.current.error);
      }
      expect(communitiesResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              id: createCommunityResult.current.data!.id,
              name: communityData.name,
              level: communityData.level,
            })
          ]),
          error: null,
        })
      );
    });
  });

  test('should successfully update a community when authenticated as organizer', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
    );

    // Sign up and sign in test user
    const { result: signUpResult } = renderHook(() => useSignUp(), {
      wrapper,
    });

    await act(async () => {
      signUpResult.current.mutate({
        email: testUser.email,
        password: testUser.password,
      });
    });

    await waitFor(() => {
      if (signUpResult.current.isError) {
        console.error('Sign up error:', signUpResult.current.error);
      }
      expect(signUpResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.objectContaining({
            user: expect.objectContaining({
              id: expect.any(String),
            }),
          }),
          error: null,
        })
      );
    });
    testUser.userId = signUpResult.current.data?.user?.id;

    const { result: signInResult } = renderHook(() => useSignIn(), {
      wrapper,
    });

    await act(async () => {
      signInResult.current.mutate({
        email: testUser.email,
        password: testUser.password,
      });
    });

    await waitFor(() => {
      if (signInResult.current.isError) {
        console.error('Sign in error:', signInResult.current.error);
      }
      expect(signInResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.objectContaining({
            user: expect.objectContaining({
              id: expect.any(String),
            }),
          }),
          error: null,
        })
      );
    });

    // Create a community first
    const { result: createCommunityResult } = renderHook(() => useCreateCommunity(), {
      wrapper,
    });

    const communityData = {
      name: generateTestName('Test Community to Update'),
      description: faker.lorem.paragraph(),
      level: 'neighborhood' as const,
      timeZone: 'America/New_York',
      organizerId: testUser.userId!,
      parentId: null,
      hierarchyPath: [{ level: 'test', name: 'Test' }],
      memberCount: 1,
    };

    await act(async () => {
      createCommunityResult.current.mutate(communityData);
    });

    await waitFor(() => {
      if (createCommunityResult.current.isError) {
        console.error('Create community error:', createCommunityResult.current.error);
      }
      expect(createCommunityResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.objectContaining({
            id: expect.any(String),
          }),
          error: null,
        })
      );
    });
    const createdCommunity = createCommunityResult.current.data;
    expect(createdCommunity).toBeDefined();

    // Track for cleanup
    createdCommunityIds.push(createdCommunity!.id);

    // Update the community
    const { result: updateCommunityResult } = renderHook(() => useUpdateCommunity(), {
      wrapper,
    });

    const updatedName = generateTestName('Updated Community');
    const updatedDescription = faker.lorem.paragraph();
    const updateData = {
      id: createdCommunity!.id,
      name: updatedName,
      description: updatedDescription,
      level: communityData.level,
      timeZone: communityData.timeZone,
      hierarchyPath: communityData.hierarchyPath,
    };

    await act(async () => {
      updateCommunityResult.current.mutate(updateData);
    });

    await waitFor(() => {
      if (updateCommunityResult.current.isError) {
        console.error('Update community error:', updateCommunityResult.current.error);
      }
      expect(updateCommunityResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.objectContaining({
            id: createdCommunity!.id,
            name: updatedName,
            description: updatedDescription,
            level: communityData.level,
            timeZone: communityData.timeZone,
          }),
          error: null,
        })
      );
    });

    // Verify community is updated in the list
    const { result: verifyUpdateResult } = renderHook(() => useCommunities(), {
      wrapper,
    });

    await waitFor(() => {
      if (verifyUpdateResult.current.isError) {
        console.error('Verify update error:', verifyUpdateResult.current.error);
      }
      expect(verifyUpdateResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              id: createdCommunity!.id,
              name: updatedName,
            })
          ]),
          error: null,
        })
      );
    });
  });

  test('should successfully delete a community when authenticated as organizer', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
    );

    // Sign up and sign in test user
    const { result: signUpResult } = renderHook(() => useSignUp(), {
      wrapper,
    });

    await act(async () => {
      signUpResult.current.mutate({
        email: testUser.email,
        password: testUser.password,
      });
    });

    await waitFor(() => {
      if (signUpResult.current.isError) {
        console.error('Sign up error:', signUpResult.current.error);
      }
      expect(signUpResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.objectContaining({
            user: expect.objectContaining({
              id: expect.any(String),
            }),
          }),
          error: null,
        })
      );
    });
    testUser.userId = signUpResult.current.data?.user?.id;

    const { result: signInResult } = renderHook(() => useSignIn(), {
      wrapper,
    });

    await act(async () => {
      signInResult.current.mutate({
        email: testUser.email,
        password: testUser.password,
      });
    });

    await waitFor(() => {
      if (signInResult.current.isError) {
        console.error('Sign in error:', signInResult.current.error);
      }
      expect(signInResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.objectContaining({
            user: expect.objectContaining({
              id: expect.any(String),
            }),
          }),
          error: null,
        })
      );
    });

    // Create a community first
    const { result: createCommunityResult } = renderHook(() => useCreateCommunity(), {
      wrapper,
    });

    const communityData = {
      name: generateTestName('Test Community to Delete'),
      description: faker.lorem.paragraph(),
      level: 'neighborhood' as const,
      timeZone: 'America/New_York',
      organizerId: testUser.userId!,
      parentId: null,
      hierarchyPath: [{ level: 'test', name: 'Test' }],
      memberCount: 1,
    };

    await act(async () => {
      createCommunityResult.current.mutate(communityData);
    });

    await waitFor(() => expect(createCommunityResult.current.isSuccess).toBe(true));
    const createdCommunity = createCommunityResult.current.data;
    expect(createdCommunity).toBeDefined();

    // Delete the community
    const { result: deleteCommunityResult } = renderHook(() => useDeleteCommunity(), {
      wrapper,
    });

    await act(async () => {
      deleteCommunityResult.current.mutate(createdCommunity!.id);
    });

    await waitFor(() => {
      if (deleteCommunityResult.current.isError) {
        console.error('Delete community error:', deleteCommunityResult.current.error);
      }
      expect(deleteCommunityResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          error: null,
        })
      );
    });

    // Verify community is deleted (or at least not findable in the list)
    const { result: verifyDeleteResult } = renderHook(() => useCommunities(), {
      wrapper,
    });

    await waitFor(() => {
      if (verifyDeleteResult.current.isError) {
        console.error('Verify delete error:', verifyDeleteResult.current.error);
      }
      expect(verifyDeleteResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.not.arrayContaining([
            expect.objectContaining({
              id: createdCommunity!.id,
            })
          ]),
          error: null,
        })
      );
    });
  });
});