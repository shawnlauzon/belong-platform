import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import {
  fetchResources,
  fetchResourceInfoById,
  createResource,
  updateResource,
  deleteResource,
} from '../../../src/features/resources/api';
import { ResourceCategory } from '../../../src/features/resources/types';
import type { ResourceData } from '../../../src/features/resources/types';

// Simple test data
const createTestResourceData = (
  overrides: Partial<ResourceData> = {},
): ResourceData => ({
  type: 'offer',
  category: ResourceCategory.TOOLS,
  title: `TEST_API_RESOURCE_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
  description: 'Test resource description for API testing',
  communityId: '', // Will need to be set to actual community ID
  ownerId: '', // Will need to be set to actual user ID
  imageUrls: [],
  ...overrides,
});

// Simple cleanup function
const cleanupTestResources = async (supabase: any) => {
  await supabase
    .from('resources')
    .delete()
    .like('title', 'TEST_API_RESOURCE_%');
};

describe('Resources API Integration Tests', () => {
  let supabase: any;
  let testResourceId: string | null = null;

  beforeEach(() => {
    supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!,
    );
  });

  afterEach(async () => {
    await cleanupTestResources(supabase);
    testResourceId = null;
  });

  test('fetchResources should return array of resources', async () => {
    const resources = await fetchResources(supabase);

    expect(Array.isArray(resources)).toBe(true);

    // If there are resources, check structure
    if (resources.length > 0) {
      const resource = resources[0];
      expect(resource).toHaveProperty('id');
      expect(resource).toHaveProperty('title');
      expect(resource).toHaveProperty('type');
      expect(resource).toHaveProperty('category');
      expect(resource).toHaveProperty('ownerId');
      expect(resource).toHaveProperty('communityId');
      expect(resource).toHaveProperty('createdAt');
      expect(resource).toHaveProperty('updatedAt');
    }
  });

  test('fetchResources should handle empty results', async () => {
    // Clean up first to potentially get empty results
    await cleanupTestResources(supabase);

    const resources = await fetchResources(supabase);

    expect(Array.isArray(resources)).toBe(true);
    // Note: might still have other resources, so just verify it's an array
  });

  test('fetchResources should filter by category', async () => {
    const resources = await fetchResources(supabase, { category: 'tools' });

    expect(Array.isArray(resources)).toBe(true);

    // If there are results, verify they match the filter
    resources.forEach((resource) => {
      expect(resource.category).toBe('tools');
    });
  });

  test('fetchResources should filter by type', async () => {
    const resources = await fetchResources(supabase, { type: 'offer' });

    expect(Array.isArray(resources)).toBe(true);

    // If there are results, verify they match the filter
    resources.forEach((resource) => {
      expect(resource.type).toBe('offer');
    });
  });

  test('fetchResources should filter by search term', async () => {
    const resources = await fetchResources(supabase, { searchTerm: 'test' });

    expect(Array.isArray(resources)).toBe(true);

    // If there are results, verify they contain the search term
    resources.forEach((resource) => {
      const titleMatch = resource.title.toLowerCase().includes('test');
      const descriptionMatch = resource.description
        ?.toLowerCase()
        .includes('test');
      expect(titleMatch || descriptionMatch).toBe(true);
    });
  });

  test('createResource should create and return new resource', async () => {
    // Skip if we don't have required IDs for testing
    if (!process.env.TEST_USER_ID || !process.env.TEST_COMMUNITY_ID) {
      console.warn(
        'Skipping createResource test - missing TEST_USER_ID or TEST_COMMUNITY_ID',
      );
      return;
    }

    const resourceData = createTestResourceData({
      ownerId: process.env.TEST_USER_ID,
      communityId: process.env.TEST_COMMUNITY_ID,
    });

    const createdResource = await createResource(supabase, resourceData);

    expect(createdResource).not.toBeNull();
    expect(createdResource!.id).toBeDefined();
    expect(createdResource!.title).toBe(resourceData.title);
    expect(createdResource!.type).toBe(resourceData.type);
    expect(createdResource!.category).toBe(resourceData.category);
    expect(createdResource!.ownerId).toBe(resourceData.ownerId);
    expect(createdResource!.communityId).toBe(resourceData.communityId);
    expect(createdResource!.createdAt).toBeDefined();
    expect(createdResource!.updatedAt).toBeDefined();

    testResourceId = createdResource!.id;
  });

  test('createResource should throw error with invalid data', async () => {
    const invalidResourceData = createTestResourceData({
      ownerId: 'invalid-user-id',
      communityId: 'invalid-community-id',
    });

    await expect(
      createResource(supabase, invalidResourceData),
    ).rejects.toThrow();
  });

  test('fetchResourceById should return specific resource', async () => {
    // Skip if we don't have a test resource
    if (!testResourceId) {
      console.warn(
        'Skipping fetchResourceById test - no test resource available',
      );
      return;
    }

    const resource = await fetchResourceInfoById(supabase, testResourceId);

    expect(resource).not.toBeNull();
    expect(resource!.id).toBe(testResourceId);
    expect(resource!.title).toContain('TEST_API_RESOURCE_');
  });

  test('fetchResourceInfoById should return null for non-existent ID', async () => {
    const nonExistentId = 'non-existent-id-123';

    const resource = await fetchResourceInfoById(supabase, nonExistentId);

    expect(resource).toBeNull();
  });

  test('updateResource should modify existing resource', async () => {
    // Skip if we don't have a test resource
    if (!testResourceId) {
      console.warn('Skipping updateResource test - no test resource available');
      return;
    }

    const updatedTitle = `UPDATED_TEST_API_RESOURCE_${Date.now()}`;
    const updatedDescription = 'Updated description for API testing';

    const updatedResource = await updateResource(supabase, testResourceId, {
      title: updatedTitle,
      description: updatedDescription,
    });

    expect(updatedResource).not.toBeNull();
    expect(updatedResource!.id).toBe(testResourceId);
    expect(updatedResource!.title).toBe(updatedTitle);
    expect(updatedResource!.description).toBe(updatedDescription);
    expect(updatedResource!.updatedAt).toBeDefined();
  });

  test('updateResource should throw error for non-existent resource', async () => {
    const nonExistentId = 'non-existent-id-123';

    await expect(
      updateResource(supabase, nonExistentId, {
        title: 'Updated Title',
      }),
    ).rejects.toThrow();
  });

  test('deleteResource should remove resource from database', async () => {
    // Skip if we don't have a test resource
    if (!testResourceId) {
      console.warn('Skipping deleteResource test - no test resource available');
      return;
    }

    // Delete the resource
    await deleteResource(supabase, testResourceId);

    // Verify it's gone
    const deletedResource = await fetchResourceInfoById(
      supabase,
      testResourceId,
    );
    expect(deletedResource).toBeNull();

    testResourceId = null; // Mark as cleaned up
  });

  test('deleteResource should handle non-existent resource gracefully', async () => {
    // Use a valid UUID format but non-existent ID
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    // Should not throw an error for valid UUID format
    await expect(
      deleteResource(supabase, nonExistentId),
    ).resolves.not.toThrow();
  });

  test('deleteResource should throw error for invalid UUID format', async () => {
    const invalidId = 'non-existent-id-123';

    // Should throw an error for invalid UUID format
    await expect(deleteResource(supabase, invalidId)).rejects.toThrow();
  });

  test('API functions should handle database connection errors', async () => {
    // Create a client with invalid credentials
    const invalidSupabase = createClient(
      'https://invalid.supabase.co',
      'invalid-key',
    );

    // These should handle errors gracefully
    const resources = await fetchResources(invalidSupabase);
    expect(Array.isArray(resources)).toBe(true);
    expect(resources.length).toBe(0);

    const resource = await fetchResourceInfoById(invalidSupabase, 'any-id');
    expect(resource).toBeNull();
  });

  test('API functions should handle malformed data gracefully', async () => {
    // Test with various edge cases
    const emptyFilter = await fetchResources(supabase, {});
    expect(Array.isArray(emptyFilter)).toBe(true);

    const emptySearchTerm = await fetchResources(supabase, { searchTerm: '' });
    expect(Array.isArray(emptySearchTerm)).toBe(true);

    const allCategory = await fetchResources(supabase, { category: 'all' });
    expect(Array.isArray(allCategory)).toBe(true);

    const allType = await fetchResources(supabase, { type: 'all' });
    expect(Array.isArray(allType)).toBe(true);
  });
});
