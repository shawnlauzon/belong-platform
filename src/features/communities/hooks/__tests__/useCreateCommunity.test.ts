import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useCreateCommunity } from '../useCreateCommunity';
import { createMockCommunityData } from '../../__mocks__';
import type { IsochroneBoundary } from '../../types/domain';

// Mock shared module
vi.mock('../../../../shared', () => ({
  useSupabase: vi.fn(),
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  queryKeys: {
    communities: {
      memberships: vi.fn((id) => ['communities', 'memberships', id]),
      userMemberships: vi.fn((id) => ['communities', 'userMemberships', id]),
    },
  },
}));

// Mock the community service
vi.mock('../../services/community.service', () => ({
  createCommunityService: vi.fn(() => ({
    createCommunity: vi.fn(),
  })),
}));

import { createCommunityService } from '../../services/community.service';

describe('useCreateCommunity Hook', () => {
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
      createCommunity: vi.fn(),
    };
    vi.mocked(createCommunityService).mockReturnValue(mockCommunityService);
  });

  const wrapper = ({ children }: { children: any }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it('should accept community data with isochrone boundary', async () => {
    // Arrange
    const mockBoundary: IsochroneBoundary = {
      type: 'isochrone',
      center: [-74.006, 40.7128], // NYC coordinates
      travelMode: 'walking',
      minutes: 15,
      polygon: {
        type: 'Polygon',
        coordinates: [[
          [-74.006, 40.7128],
          [-74.005, 40.7128],
          [-74.005, 40.7129],
          [-74.006, 40.7129],
          [-74.006, 40.7128],
        ]],
      },
      area: 2.5,
    };

    const communityData = createMockCommunityData({
      name: 'NYC Walking Community',
      boundary: mockBoundary,
    });

    const mockCreatedCommunity = {
      id: 'created-community-123',
      name: 'NYC Walking Community',
      organizer: { id: 'user-123' },
      boundary: mockBoundary,
      memberCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockCommunityService.createCommunity.mockResolvedValue(mockCreatedCommunity);

    // Act
    const { result } = renderHook(() => useCreateCommunity(), { wrapper });

    // Assert that the hook function accepts boundary data without errors
    expect(result.current).toBeInstanceOf(Function);
    
    // Call the function to ensure it works with boundary data
    const createdCommunity = await result.current(communityData);
    
    expect(createdCommunity.id).toBe('created-community-123');
    expect(mockCommunityService.createCommunity).toHaveBeenCalledWith(communityData);
  });

  it('should accept community data with circular boundary', async () => {
    // Arrange
    const communityData = createMockCommunityData({
      name: 'Circular Boundary Community',
      boundary: {
        type: 'circular',
        center: [-74.006, 40.7128],
        radius_km: 5,
      },
    });

    const mockCreatedCommunity = {
      id: 'created-community-456',
      name: 'Circular Boundary Community',
      organizer: { id: 'user-123' },
      boundary: communityData.boundary,
      memberCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockCommunityService.createCommunity.mockResolvedValue(mockCreatedCommunity);

    // Act
    const { result } = renderHook(() => useCreateCommunity(), { wrapper });

    // Assert that the hook function accepts boundary data without errors
    expect(result.current).toBeInstanceOf(Function);
    
    // Call the function to ensure it works with boundary data
    const createdCommunity = await result.current(communityData);
    
    expect(createdCommunity.id).toBe('created-community-456');
    expect(mockCommunityService.createCommunity).toHaveBeenCalledWith(communityData);
  });

  it('should accept community data without boundary (legacy support)', async () => {
    // Arrange
    const communityData = createMockCommunityData({
      name: 'Legacy Community',
      // No boundary field - should still work
    });

    const mockCreatedCommunity = {
      id: 'created-community-789',
      name: 'Legacy Community',
      organizer: { id: 'user-123' },
      boundary: undefined,
      memberCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockCommunityService.createCommunity.mockResolvedValue(mockCreatedCommunity);

    // Act
    const { result } = renderHook(() => useCreateCommunity(), { wrapper });

    // Assert that the hook function works without boundary data
    expect(result.current).toBeInstanceOf(Function);
    
    // Call the function to ensure it works without boundary data
    const createdCommunity = await result.current(communityData);
    
    expect(createdCommunity.id).toBe('created-community-789');
    expect(mockCommunityService.createCommunity).toHaveBeenCalledWith(communityData);
  });
});