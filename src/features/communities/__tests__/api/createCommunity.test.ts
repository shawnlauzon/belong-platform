import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCommunity } from '../../api/createCommunity';
import {
  createFakeCommunityData,
  createFakeDbCommunity,
} from '../../__fakes__';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
  },
} as unknown as SupabaseClient<Database>;

// Create a test ID that will be used consistently
const fakeOrganizerId = 'fake-user-id';

// Mock the auth helper
vi.mock('@/shared/utils/auth-helpers', () => ({
  getAuthIdOrThrow: vi.fn().mockResolvedValue('fake-user-id'),
}));

describe('createCommunity API', () => {
  const mockSelect = vi.fn();
  const mockSingle = vi.fn();
  const mockInsert = vi.fn();
  const mockFrom = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup the mock chain with completely fake data
    const fakeDbCommunity = createFakeDbCommunity({
      organizer_id: fakeOrganizerId,
    });

    mockSingle.mockResolvedValue({
      data: fakeDbCommunity,
      error: null,
    });

    mockSelect.mockReturnValue({ single: mockSingle });
    mockInsert.mockReturnValue({ select: mockSelect });
    mockFrom.mockReturnValue({ insert: mockInsert });

    (mockSupabase.from as unknown as typeof mockFrom) = mockFrom;
  });

  it('should transform organizerId to organizer_id in database insert', async () => {
    const communityData = createFakeCommunityData({
      name: 'Test Community',
    });

    await createCommunity(mockSupabase, communityData);

    // Verify that the insert was called with organizer_id (snake_case), not organizerId
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        organizer_id: fakeOrganizerId, // Should be snake_case
      }),
    );

    // Verify that organizerId (camelCase) is NOT in the database insert
    expect(mockInsert).not.toHaveBeenCalledWith(
      expect.objectContaining({
        organizerId: expect.any(String), // Should NOT be camelCase
      }),
    );
  });

  it('should fail if organizerId is passed to database instead of organizer_id', async () => {
    // Simulate the error condition where organizerId gets passed to database
    mockSingle.mockResolvedValue({
      data: null,
      error: {
        code: 'PGRST204',
        message:
          "Could not find the 'organizerId' column of 'communities' in the schema cache",
      },
    });

    const communityData = createFakeCommunityData({
      name: 'Test Community',
    });

    await expect(createCommunity(mockSupabase, communityData)).rejects.toThrow(
      "Could not find the 'organizerId' column",
    );
  });

  it('should correctly store all community data with proper transformations', async () => {
    // Use completely fake data
    const communityData = createFakeCommunityData();
    const mockDbResponse = createFakeDbCommunity({
      organizer_id: fakeOrganizerId,
    });

    mockSingle.mockResolvedValue({ data: mockDbResponse, error: null });

    const result = await createCommunity(mockSupabase, communityData);

    // Verify the database insert contains correctly transformed data
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: communityData.name,
        description: communityData.description,
        icon: communityData.icon,
        organizer_id: fakeOrganizerId,
        member_count: communityData.memberCount,
        time_zone: communityData.timeZone,
        center: `POINT(${communityData.center.lng} ${communityData.center.lat})`,
        boundary: expect.objectContaining({
          type: 'isochrone',
          travelMode: communityData.boundary?.travelMode,
          travelTimeMin: communityData.boundary?.travelTimeMin,
          areaSqKm: communityData.boundary?.areaSqKm,
        }),
        boundary_geometry: expect.objectContaining({
          type: 'Polygon',
        }),
      }),
    );

    // Verify the returned CommunityInfo object has correct structure
    expect(result).toEqual(
      expect.objectContaining({
        id: mockDbResponse.id,
        name: mockDbResponse.name,
        description: mockDbResponse.description,
        icon: mockDbResponse.icon,
        organizerId: fakeOrganizerId,
        memberCount: mockDbResponse.member_count,
        timeZone: mockDbResponse.time_zone,
        center: {
          lat: (mockDbResponse.center as any).coordinates[1],
          lng: (mockDbResponse.center as any).coordinates[0],
        },
        boundary: expect.objectContaining({
          type: 'isochrone',
          travelMode: mockDbResponse.boundary?.travelMode,
          travelTimeMin: mockDbResponse.boundary?.travelTimeMin,
          areaSqKm: mockDbResponse.boundary?.areaSqKm,
        }),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      }),
    );
  });
});
