import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import type { ThanksInfo } from '@belongnetwork/types';
import { useThanks } from '../hooks/useThanks';

// Mock the auth provider
vi.mock('../../auth/providers/CurrentUserProvider', () => ({
  useSupabase: vi.fn(),
}));

// Mock the thanks service
vi.mock('../services/thanks.service', () => ({
  createThanksService: vi.fn(),
}));

import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createThanksService } from '../services/thanks.service';

const mockUseSupabase = vi.mocked(useSupabase);
const mockCreateThanksService = vi.mocked(createThanksService);
const mockFetchThanks = vi.fn();

describe('useThanks', () => {
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
    
    // Setup mocks
    mockUseSupabase.mockReturnValue({} as any);
    mockCreateThanksService.mockReturnValue({
      fetchThanks: mockFetchThanks,
    });
  });

  const wrapper = ({ children }: { children: any }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it('should return ThanksInfo[] instead of Thanks[]', async () => {
    // Arrange: Mock return value should be ThanksInfo[]
    const mockThanksInfo: ThanksInfo[] = [
      {
        id: 'thanks-1',
        message: 'Thank you for the awesome drill!',
        fromUserId: 'user-1', // ID instead of User object
        toUserId: 'user-2', // ID instead of User object
        resourceId: 'resource-1', // ID instead of Resource object
        communityId: 'community-1', // Added for safety
        impactDescription: 'Helped me fix my fence',
        imageUrls: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockFetchThanks.mockResolvedValue(mockThanksInfo);

    // Act
    const { result } = renderHook(() => useThanks(), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockThanksInfo);
    expect(mockFetchThanks).toHaveBeenCalledWith(undefined);
    
    // Verify the returned data has ID references, not full objects
    const thanks = result.current.data![0];
    expect(typeof thanks.fromUserId).toBe('string');
    expect(typeof thanks.toUserId).toBe('string');
    expect(typeof thanks.resourceId).toBe('string');
    expect(typeof thanks.communityId).toBe('string');
    expect(thanks).not.toHaveProperty('fromUser');
    expect(thanks).not.toHaveProperty('toUser');
    expect(thanks).not.toHaveProperty('resource');
  });

  it('should pass filters to fetchThanks and return ThanksInfo[]', async () => {
    // Arrange
    const filters = { sentBy: 'user-1' };
    const mockThanksInfo: ThanksInfo[] = [];
    mockFetchThanks.mockResolvedValue(mockThanksInfo);

    // Act
    const { result } = renderHook(() => useThanks(filters), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetchThanks).toHaveBeenCalledWith(filters);
    expect(result.current.data).toEqual(mockThanksInfo);
  });
});