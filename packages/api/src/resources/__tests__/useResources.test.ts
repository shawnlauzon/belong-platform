import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import type { ResourceInfo } from '@belongnetwork/types';
import { fetchResources } from '../impl/fetchResources';
import { useResources } from '../hooks/useResources';

// Mock the implementation
vi.mock('../impl/fetchResources', () => ({
  fetchResources: vi.fn(),
}));

const mockFetchResources = vi.mocked(fetchResources);

describe('useResources', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: any }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it('should return ResourceInfo[] instead of Resource[]', async () => {
    // Arrange: Mock return value should be ResourceInfo[]
    const mockResourceInfo: ResourceInfo[] = [
      {
        id: 'resource-1',
        type: 'offer',
        category: 'tools' as const,
        title: 'Drill',
        description: 'Power drill for DIY projects',
        ownerId: 'user-1', // ID instead of User object
        communityId: 'community-1', // ID instead of Community object
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockFetchResources.mockResolvedValue(mockResourceInfo);

    // Act
    const { result } = renderHook(() => useResources(), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockResourceInfo);
    expect(mockFetchResources).toHaveBeenCalledWith(undefined);
    
    // Verify the returned data has ID references, not full objects
    const resource = result.current.data![0];
    expect(typeof resource.ownerId).toBe('string');
    expect(typeof resource.communityId).toBe('string');
    expect(resource).not.toHaveProperty('owner');
    expect(resource).not.toHaveProperty('community');
  });

  it('should pass filters to fetchResources and return ResourceInfo[]', async () => {
    // Arrange
    const filters = { category: 'tools' as const };
    const mockResourceInfo: ResourceInfo[] = [];
    mockFetchResources.mockResolvedValue(mockResourceInfo);

    // Act
    const { result } = renderHook(() => useResources(filters), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetchResources).toHaveBeenCalledWith(filters);
    expect(result.current.data).toEqual(mockResourceInfo);
  });
});