import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';
import React from 'react';
import {
  useResources,
  useResource,
  useCreateResource,
  useUpdateResource,
  useDeleteResource,
  ResourceCategory,
  BelongProvider,
  type ResourceData,
} from '../../../src';

// Simple test wrapper for React Query and BelongProvider
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
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
      React.createElement(BelongProvider, { config, children }),
    );
};

// Simple test data
const createTestResourceData = (
  overrides: Partial<ResourceData> = {},
): ResourceData => ({
  type: 'offer',
  category: ResourceCategory.TOOLS,
  title: `TEST_RESOURCE_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
  description: 'Test resource description',
  communityId: '', // Will need to be set to actual community ID
  ownerId: '', // Will need to be set to actual user ID
  imageUrls: [],
  ...overrides,
});

// Simple cleanup function
const cleanupTestResources = async () => {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
  );

  await supabase.from('resources').delete().like('title', 'TEST_RESOURCE_%');
};

describe('Resources Integration Tests', () => {
  let wrapper: ReturnType<typeof createTestWrapper>;
  let testResourceId: string | null = null;

  beforeEach(() => {
    wrapper = createTestWrapper();
  });

  afterEach(async () => {
    await cleanupTestResources();
    testResourceId = null;
  });

  test('should list resources from database', async () => {
    const { result } = renderHook(() => useResources(), { wrapper });

    await waitFor(() =>
      expect(result.current.isSuccess || result.current.isError).toBeTruthy(),
    );
    if (result.current.isError) {
      throw result.current.error;
    }

    expect(result.current.data).toBeInstanceOf(Array);
  });

  test('should handle empty resources list', async () => {
    // First clean up any existing test resources
    await cleanupTestResources();

    const { result } = renderHook(() => useResources(), { wrapper });

    await waitFor(() =>
      expect(result.current.isSuccess || result.current.isError).toBeTruthy(),
    );
    if (result.current.isError) {
      throw result.current.error;
    }

    expect(result.current.data).toBeInstanceOf(Array);
    // May have other resources, so just verify it's an array
  });

  test('should create a new resource', async () => {
    // Skip if we don't have required IDs for testing
    if (!process.env.TEST_USER_ID || !process.env.TEST_COMMUNITY_ID) {
      console.warn(
        'Skipping create test - missing TEST_USER_ID or TEST_COMMUNITY_ID',
      );
      return;
    }

    const { result } = renderHook(() => useCreateResource(), { wrapper });

    const resourceData = createTestResourceData({
      ownerId: process.env.TEST_USER_ID,
      communityId: process.env.TEST_COMMUNITY_ID,
    });

    const createdResource = await result.current.mutateAsync(resourceData);

    expect(createdResource).toBeDefined();
    expect(createdResource.id).toBeDefined();
    expect(createdResource.title).toBe(resourceData.title);
    expect(createdResource.type).toBe(resourceData.type);
    expect(createdResource.category).toBe(resourceData.category);

    testResourceId = createdResource.id;
  });

  test('should get single resource by ID', async () => {
    // Skip if we don't have a test resource
    if (!testResourceId) {
      console.warn(
        'Skipping single resource test - no test resource available',
      );
      return;
    }

    const { result } = renderHook(() => useResource(testResourceId!), {
      wrapper,
    });

    await waitFor(() =>
      expect(result.current.isSuccess || result.current.isError).toBeTruthy(),
    );
    if (result.current.isError) {
      throw result.current.error;
    }

    expect(result.current.data.id).toBe(testResourceId);
  });

  test('should handle non-existent resource ID', async () => {
    const nonExistentId = 'non-existent-id-123';
    const { result } = renderHook(() => useResource(nonExistentId), {
      wrapper,
    });

    await waitFor(() =>
      expect(result.current.isSuccess || result.current.isError).toBeTruthy(),
    );
    if (result.current.isError) {
      throw result.current.error;
    }
    expect(result.current.data).toBeNull();
  });

  test('should update existing resource', async () => {
    // Skip if we don't have a test resource
    if (!testResourceId) {
      console.warn('Skipping update test - no test resource available');
      return;
    }

    const { result } = renderHook(() => useUpdateResource(), { wrapper });

    const updatedTitle = `UPDATED_TEST_RESOURCE_${Date.now()}`;
    const updatedResource = await result.current.mutateAsync({
      id: testResourceId,
      data: { title: updatedTitle },
    });

    expect(updatedResource).toBeDefined();
    expect(updatedResource.title).toBe(updatedTitle);
    expect(updatedResource.id).toBe(testResourceId);
  });

  test('should delete existing resource', async () => {
    // Skip if we don't have a test resource
    if (!testResourceId) {
      console.warn('Skipping delete test - no test resource available');
      return;
    }

    const { result: deleteResult } = renderHook(() => useDeleteResource(), {
      wrapper,
    });
    const { result: listResult } = renderHook(() => useResources(), {
      wrapper,
    });

    // Delete the resource
    await deleteResult.current.mutateAsync(testResourceId);

    // Wait for list to update
    await waitFor(
      () => {
        const resources = listResult.current || [];
        const stillExists = resources.some((r) => r.id === testResourceId);
        expect(stillExists).toBe(false);
      },
      { timeout: 10000 },
    );

    testResourceId = null; // Mark as cleaned up
  });

  test('should filter resources by category', async () => {
    const { result } = renderHook(() => useResources({ category: 'tools' }), {
      wrapper,
    });

    await waitFor(() =>
      expect(result.current.isSuccess || result.current.isError).toBeTruthy(),
    );
    if (result.current.isError) {
      throw result.current.error;
    }

    expect(result.current.data).toBeInstanceOf(Array);

    // If there are results, verify they match the filter
    if (result.current && result.current.length > 0) {
      result.current.forEach((resource) => {
        expect(resource.category).toBe('tools');
      });
    }
  });

  test('should filter resources by type', async () => {
    const { result } = renderHook(() => useResources({ type: 'offer' }), {
      wrapper,
    });

    await waitFor(() =>
      expect(result.current.isSuccess || result.current.isError).toBeTruthy(),
    );
    if (result.current.isError) {
      throw result.current.error;
    }

    expect(result.current.data).toBeInstanceOf(Array);

    // If there are results, verify they match the filter
    if (result.current && result.current.length > 0) {
      result.current.forEach((resource) => {
        expect(resource.type).toBe('offer');
      });
    }
  });
});
