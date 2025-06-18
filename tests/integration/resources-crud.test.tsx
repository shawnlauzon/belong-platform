import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { faker } from '@faker-js/faker';
import React from 'react';
import { QueryClient } from '@tanstack/react-query';
import {
  initializeBelong,
  useResources,
  useCreateResource,
  useUpdateResource,
  useDeleteResource,
  useSignIn,
  useSignUp,
  useCommunities,
  resetBelongClient,
  ResourceCategory,
} from '@belongnetwork/platform';
import { TestWrapper } from './database/utils/test-wrapper';
import { generateTestName } from './database/utils/database-helpers';

describe('Resources CRUD Integration Tests', () => {
  let testUser: { email: string; password: string; userId?: string };
  let testCommunity: { id?: string; name: string };
  let createdResourceIds: string[] = [];
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

    // Generate unique test community
    testCommunity = {
      name: generateTestName('Test Community'),
    };

    createdResourceIds = [];
  });

  afterEach(async () => {
    // Clean up created resources
    if (createdResourceIds.length > 0) {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
      );

      const { result: deleteResult } = renderHook(() => useDeleteResource(), {
        wrapper,
      });

      for (const resourceId of createdResourceIds) {
        await act(async () => {
          deleteResult.current.mutate(resourceId);
        });
        
        await waitFor(() => {
          if (deleteResult.current.isError) {
            console.error('Delete resource cleanup error:', deleteResult.current.error);
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

  test('should successfully read resources without authentication', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
    );

    const { result: resourcesResult } = renderHook(() => useResources(), {
      wrapper,
    });

    await waitFor(() => {
      if (resourcesResult.current.isError) {
        console.error('Fetch resources error:', resourcesResult.current.error);
      }
      expect(resourcesResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              title: expect.any(String),
              category: expect.any(String),
              type: expect.stringMatching(/^(offer|request)$/),
            })
          ]),
          error: null,
        })
      );
    });
  });

  test('should successfully create a resource when authenticated', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
    );

    // Get existing communities to use for testing
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
          data: expect.any(Array),
          error: null,
        })
      );
    });
    const existingCommunity = communitiesResult.current.data?.[0];
    expect(existingCommunity).toBeDefined();
    testCommunity.id = existingCommunity!.id;

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

    // Create a resource
    const { result: createResourceResult } = renderHook(() => useCreateResource(), {
      wrapper,
    });

    const resourceData = {
      title: generateTestName('Test Resource'),
      description: faker.lorem.paragraph(),
      category: ResourceCategory.FOOD,
      type: 'offer' as const,
      communityId: testCommunity.id!,
      isActive: true,
      imageUrls: [],
    };

    await act(async () => {
      createResourceResult.current.mutate(resourceData);
    });

    await waitFor(() => {
      if (createResourceResult.current.isError) {
        console.error('Create resource error:', createResourceResult.current.error);
      }
      expect(createResourceResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.objectContaining({
            id: expect.any(String),
            title: resourceData.title,
            description: resourceData.description,
            category: resourceData.category,
            type: resourceData.type,
            isActive: resourceData.isActive,
          }),
          error: null,
        })
      );
    });
    
    // Track for cleanup
    createdResourceIds.push(createResourceResult.current.data!.id);

    // Verify resource appears in resources list
    const { result: resourcesResult } = renderHook(() => useResources(), {
      wrapper,
    });

    await waitFor(() => {
      if (resourcesResult.current.isError) {
        console.error('Fetch resources list error:', resourcesResult.current.error);
      }
      expect(resourcesResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              id: createResourceResult.current.data!.id,
              title: resourceData.title,
              category: resourceData.category,
              type: resourceData.type,
            })
          ]),
          error: null,
        })
      );
    });
  });

  test('should successfully update a resource when authenticated as owner', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
    );

    // Get existing communities to use for testing
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
          data: expect.any(Array),
          error: null,
        })
      );
    });
    const existingCommunity = communitiesResult.current.data?.[0];
    expect(existingCommunity).toBeDefined();
    testCommunity.id = existingCommunity!.id;

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

    // Create a resource first
    const { result: createResourceResult } = renderHook(() => useCreateResource(), {
      wrapper,
    });

    const resourceData = {
      title: generateTestName('Test Resource to Update'),
      description: faker.lorem.paragraph(),
      category: ResourceCategory.FOOD,
      type: 'offer' as const,
      communityId: testCommunity.id!,
      isActive: true,
      imageUrls: [],
    };

    await act(async () => {
      createResourceResult.current.mutate(resourceData);
    });

    await waitFor(() => {
      if (createResourceResult.current.isError) {
        console.error('Create resource error:', createResourceResult.current.error);
      }
      expect(createResourceResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.objectContaining({
            id: expect.any(String),
          }),
          error: null,
        })
      );
    });
    const createdResource = createResourceResult.current.data;
    expect(createdResource).toBeDefined();

    // Track for cleanup
    createdResourceIds.push(createdResource!.id);

    // Update the resource (skip community validation by using existing community from created resource)
    const { result: updateResourceResult } = renderHook(() => useUpdateResource(), {
      wrapper,
    });

    const updatedTitle = generateTestName('Updated Resource');
    const updatedDescription = faker.lorem.paragraph();
    const updateData = {
      id: createdResource!.id,
      title: updatedTitle,
      description: updatedDescription,
      category: ResourceCategory.TOOLS, // Change category
      type: resourceData.type,
      isActive: resourceData.isActive,
      imageUrls: resourceData.imageUrls,
    };

    await act(async () => {
      updateResourceResult.current.mutate(updateData);
    });

    await waitFor(() => {
      if (updateResourceResult.current.isError) {
        console.error('Update resource error:', updateResourceResult.current.error);
      }
      expect(updateResourceResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.objectContaining({
            id: createdResource!.id,
            title: updatedTitle,
            description: updatedDescription,
            category: ResourceCategory.TOOLS,
            type: resourceData.type,
            isActive: resourceData.isActive,
          }),
          error: null,
        })
      );
    });

    // Verify resource is updated in the list
    const { result: verifyUpdateResult } = renderHook(() => useResources(), {
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
              id: createdResource!.id,
              title: updatedTitle,
              category: ResourceCategory.TOOLS,
            })
          ]),
          error: null,
        })
      );
    });
  });

  test('should successfully delete a resource when authenticated as owner', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
    );

    // Get existing communities to use for testing
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
          data: expect.any(Array),
          error: null,
        })
      );
    });
    const existingCommunity = communitiesResult.current.data?.[0];
    expect(existingCommunity).toBeDefined();
    testCommunity.id = existingCommunity!.id;

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

    // Create a resource first
    const { result: createResourceResult } = renderHook(() => useCreateResource(), {
      wrapper,
    });

    const resourceData = {
      title: generateTestName('Test Resource to Delete'),
      description: faker.lorem.paragraph(),
      category: ResourceCategory.FOOD,
      type: 'offer' as const,
      communityId: testCommunity.id!,
      isActive: true,
      imageUrls: [],
    };

    await act(async () => {
      createResourceResult.current.mutate(resourceData);
    });

    await waitFor(() => expect(createResourceResult.current.isSuccess).toBe(true));
    const createdResource = createResourceResult.current.data;
    expect(createdResource).toBeDefined();

    // Delete the resource
    const { result: deleteResourceResult } = renderHook(() => useDeleteResource(), {
      wrapper,
    });

    await act(async () => {
      deleteResourceResult.current.mutate(createdResource!.id);
    });

    await waitFor(() => {
      if (deleteResourceResult.current.isError) {
        console.error('Delete resource error:', deleteResourceResult.current.error);
      }
      expect(deleteResourceResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          error: null,
        })
      );
    });

    // Verify resource is deleted (or at least not findable in the list)
    const { result: verifyDeleteResult } = renderHook(() => useResources(), {
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
              id: createdResource!.id,
            })
          ]),
          error: null,
        })
      );
    });
  });
});