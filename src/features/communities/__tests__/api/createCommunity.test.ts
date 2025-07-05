import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockSupabase } from '@/test-utils/supabase-mocks';
import { createFakeCommunityData, createFakeDbCommunity } from '../../__fakes__';
import { createCommunity } from '../../api/createCommunity';

const mockSupabase = createMockSupabase();

vi.mock('@/shared/utils/auth-helpers', () => ({
  getAuthIdOrThrow: vi.fn().mockResolvedValue('current-user-id'),
}));

describe('createCommunity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return CommunityInfo after creation', async () => {
    const communityData = createFakeCommunityData({
      organizerId: 'current-user-id',
    });
    const fakeCreatedRow = createFakeDbCommunity({
      organizer_id: communityData.organizerId,
      name: communityData.name,
    });

    // Mock community creation
    mockSupabase.from.mockReturnValueOnce({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: fakeCreatedRow, error: null }),
        }),
      }),
    });

    // Mock membership creation  
    mockSupabase.from.mockReturnValueOnce({
      insert: vi.fn().mockResolvedValue({ error: null }),
    });

    const result = await createCommunity(mockSupabase, communityData);

    expect(result).toEqual(
      expect.objectContaining({
        id: fakeCreatedRow.id,
        name: communityData.name,
        organizerId: communityData.organizerId,
      }),
    );
  });

  it('should throw error on database failure', async () => {
    const communityData = createFakeCommunityData();
    const dbError = new Error('Database constraint violation');
    
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: dbError }),
        }),
      }),
    });

    await expect(createCommunity(mockSupabase, communityData)).rejects.toThrow(dbError);
  });
});