import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useFeed } from '../hooks/useFeed';
import { fetchFeed } from '../api/fetchFeed';
import { useSupabase } from '@/shared';

// Mock dependencies
vi.mock('../api/fetchFeed');
vi.mock('@/shared', () => ({
  useSupabase: vi.fn(),
}));

const mockFetchFeed = vi.mocked(fetchFeed);
const mockUseSupabase = vi.mocked(useSupabase);

describe('useFeed', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: React.ReactNode }) => JSX.Element;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    mockUseSupabase.mockReturnValue({} as object);
  });

  it('should return feed data when fetch succeeds', async () => {
    const mockFeedData = {
      items: [
        { id: 'resource1', type: 'resource' as const },
        { id: 'shoutout1', type: 'shoutout' as const },
      ],
      hasMore: false,
    };

    mockFetchFeed.mockResolvedValue(mockFeedData);

    const { result } = renderHook(() => useFeed(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockFeedData);
    expect(result.current.error).toBeNull();
  });

  it('should return error when fetch fails', async () => {
    const mockError = new Error('Failed to fetch feed');
    mockFetchFeed.mockRejectedValue(mockError);

    const { result } = renderHook(() => useFeed(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(mockError);
    expect(result.current.data).toBeUndefined();
  });

  it('should show loading state initially', () => {
    mockFetchFeed.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useFeed(), { wrapper });

    expect(result.current.isPending).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it('should use correct query key', async () => {
    const mockFeedData = {
      items: [],
      hasMore: false,
    };

    mockFetchFeed.mockResolvedValue(mockFeedData);

    const { result } = renderHook(() => useFeed(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify the query was cached with the correct key
    const cachedData = queryClient.getQueryData(['feed']);
    expect(cachedData).toEqual(mockFeedData);
  });

  it('should call fetchFeed with supabase client', async () => {
    const mockSupabaseClient = { test: 'client' };
    mockUseSupabase.mockReturnValue(mockSupabaseClient as object);

    const mockFeedData = {
      items: [],
      hasMore: false,
    };

    mockFetchFeed.mockResolvedValue(mockFeedData);

    renderHook(() => useFeed(), { wrapper });

    await waitFor(() => {
      expect(mockFetchFeed).toHaveBeenCalledWith(mockSupabaseClient);
    });
  });
});