import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockSupabase } from '@/test-utils/supabase-mocks';
import { createMockDbCommunity } from '../../__mocks__';
import { fetchCommunities } from '../../api/fetchCommunities';

const mockSupabase = createMockSupabase();

describe('fetchCommunities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return array of CommunityInfo when communities exist', async () => {
    const mockRows = [
      createMockDbCommunity(),
      createMockDbCommunity(),
    ];

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockRows, error: null }),
      }),
    });

    const result = await fetchCommunities(mockSupabase);

    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe(mockRows[0].id);
    expect(result[0]?.organizerId).toBe(mockRows[0].organizer_id);
    expect(result[1]?.id).toBe(mockRows[1].id);
    expect(result[1]?.organizerId).toBe(mockRows[1].organizer_id);
  });

  it('should apply name filter', async () => {
    const mockRows = [createMockDbCommunity({ name: 'Test Community' })];

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          ilike: vi.fn().mockResolvedValue({ data: mockRows, error: null }),
        }),
      }),
    });

    const result = await fetchCommunities(mockSupabase, { name: 'Test' });

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Test Community');
  });

  it('should apply organizer filter', async () => {
    const organizerId = 'organizer-123';
    const mockRows = [createMockDbCommunity({ organizer_id: organizerId })];

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockRows, error: null }),
        }),
      }),
    });

    const result = await fetchCommunities(mockSupabase, { organizerId });

    expect(result).toHaveLength(1);
    expect(result[0]?.organizerId).toBe(organizerId);
  });

  it('should return empty array when no communities found', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    const result = await fetchCommunities(mockSupabase);

    expect(result).toEqual([]);
  });

  it('should throw error on database failure', async () => {
    const dbError = new Error('Database connection failed');
    
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: null, error: dbError }),
      }),
    });

    await expect(fetchCommunities(mockSupabase)).rejects.toThrow(dbError);
  });
});