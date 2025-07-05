import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createDefaultTestWrapper } from '@/shared/__tests__/testWrapper';
import { useCommunity } from '../../hooks/useCommunity';
import { createMockCommunityInfo } from '../../__mocks__';
import { createMockUser } from '@/features/users/__mocks__';

// Mock only external dependencies
vi.mock('../../api/fetchCommunityById', () => ({
  fetchCommunityById: vi.fn(),
}));

import { fetchCommunityById } from '../../api/fetchCommunityById';
import { useUser } from '@/features/users';

describe('useCommunity', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  const mockFetchCommunityById = vi.mocked(fetchCommunityById);
  const mockUseUser = vi.mocked(useUser);

  let mockCommunityInfo: ReturnType<typeof createMockCommunityInfo>;
  let mockOrganizer: ReturnType<typeof createMockUser>;

  beforeEach(() => {
    vi.clearAllMocks();
    ({ wrapper } = createDefaultTestWrapper());

    // Setup mock data
    mockOrganizer = createMockUser();
    mockCommunityInfo = createMockCommunityInfo({
      organizerId: mockOrganizer.id,
    });

    // Setup mocks
    mockFetchCommunityById.mockResolvedValue(mockCommunityInfo);
    mockUseUser.mockReturnValue(mockOrganizer);
  });

  it('should compose full Community from CommunityInfo + User', async () => {
    const { result } = renderHook(() => useCommunity(mockCommunityInfo.id), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    // Should return full Community object with composed data
    expect(result.current).toEqual(
      expect.objectContaining({
        id: mockCommunityInfo.id,
        name: mockCommunityInfo.name,
        description: mockCommunityInfo.description,
        organizer: mockOrganizer, // Full User object, not just ID
      }),
    );

    // Should NOT have ID reference (Info pattern converted to Domain)
    expect(result.current).not.toHaveProperty('organizerId');

    // Verify external calls were made correctly
    expect(mockFetchCommunityById).toHaveBeenCalledWith(
      expect.any(Object),
      mockCommunityInfo.id,
    );
    expect(mockUseUser).toHaveBeenCalledWith(mockCommunityInfo.organizerId);
  });

  it('should return null when community not found', async () => {
    mockFetchCommunityById.mockResolvedValue(null);

    const { result } = renderHook(() => useCommunity('nonexistent-id'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current).toBeNull();
    });
  });

  it('should return null when organizer not found', async () => {
    mockFetchCommunityById.mockResolvedValue(mockCommunityInfo);
    mockUseUser.mockReturnValue(null); // Organizer not found

    const { result } = renderHook(() => useCommunity(mockCommunityInfo.id), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current).toBeNull();
    });
  });
});