import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useCommunities } from '../useCommunities';

// Mock shared module
vi.mock('../../../../shared', () => ({
  useSupabase: vi.fn(),
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  toRecords: vi.fn((obj) => obj),
  queryKeys: {
    communities: {
      all: ['communities'],
      filtered: (filters: any) => ['communities', { filters }],
    },
  },
}));

// Mock the community service
vi.mock('../../services/community.service', () => ({
  createCommunityService: vi.fn(() => ({
    fetchCommunities: vi.fn(),
  })),
}));

import { useSupabase } from '../../../../shared';
import { createCommunityService } from '../../services/community.service';

describe('useCommunities', () => {
  let queryClient: QueryClient;
  let mockCommunityService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockCommunityService = {
      fetchCommunities: vi.fn(),
    };
    vi.mocked(createCommunityService).mockReturnValue(mockCommunityService);
  });

  const wrapper = ({ children }: { children: any }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it('should fetch communities successfully', async () => {
    const mockCommunities = [
      { id: '1', name: 'Test Community 1' },
      { id: '2', name: 'Test Community 2' },
    ];
    mockCommunityService.fetchCommunities.mockResolvedValue(mockCommunities);

    const { result } = renderHook(() => useCommunities(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockCommunities);
    expect(mockCommunityService.fetchCommunities).toHaveBeenCalledWith(undefined);
  });

  it('should apply filters when provided', async () => {
    const filters = { isActive: true, category: 'social' };
    const mockCommunities = [{ id: '1', name: 'Active Community' }];
    mockCommunityService.fetchCommunities.mockResolvedValue(mockCommunities);

    const { result } = renderHook(() => useCommunities(filters), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockCommunityService.fetchCommunities).toHaveBeenCalledWith(filters);
  });

  it('should handle errors gracefully', async () => {
    const error = new Error('Failed to fetch communities');
    mockCommunityService.fetchCommunities.mockRejectedValue(error);

    const { result } = renderHook(() => useCommunities(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });
});