import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCommunity } from '../../api/createCommunity';
import { createFakeCommunityData } from '../../__fakes__';
import { faker } from '@faker-js/faker';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
  },
} as unknown as SupabaseClient<Database>;

// Mock the auth helper
vi.mock('@/shared/utils/auth-helpers', () => ({
  getAuthIdOrThrow: vi.fn().mockResolvedValue('mock-user-id'),
}));

describe('createCommunity API', () => {
  const mockSelect = vi.fn();
  const mockSingle = vi.fn();
  const mockInsert = vi.fn();
  const mockFrom = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup the mock chain
    mockSingle.mockResolvedValue({ 
      data: {
        id: faker.string.uuid(),
        name: 'Test Community',
        organizer_id: 'mock-user-id',
        member_count: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        time_zone: 'UTC',
        center: 'POINT(-123.0087 57.2862)',
        description: 'Test description',
        icon: '🏘️',
        boundary: null,
        boundary_geometry: null,
      }, 
      error: null 
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
        organizer_id: 'mock-user-id', // Should be snake_case
        name: 'Test Community',
      })
    );

    // Verify that organizerId (camelCase) is NOT in the database insert
    expect(mockInsert).not.toHaveBeenCalledWith(
      expect.objectContaining({
        organizerId: expect.any(String), // Should NOT be camelCase
      })
    );
  });

  it('should fail if organizerId is passed to database instead of organizer_id', async () => {
    // Simulate the error condition where organizerId gets passed to database
    mockSingle.mockResolvedValue({
      data: null,
      error: {
        code: 'PGRST204',
        message: "Could not find the 'organizerId' column of 'communities' in the schema cache",
      },
    });

    const communityData = createFakeCommunityData({
      name: 'Test Community',
    });

    await expect(createCommunity(mockSupabase, communityData)).rejects.toThrow(
      "Could not find the 'organizerId' column"
    );
  });
});