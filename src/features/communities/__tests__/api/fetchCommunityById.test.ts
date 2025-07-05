import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockSupabase } from '@/test-utils/supabase-mocks';
import { createFakeDbCommunity, createFakeCommunityInfo } from '../../__fakes__';
import { fetchCommunityById } from '../../api/fetchCommunityById';

const mockSupabase = createMockSupabase();

describe('fetchCommunityById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return CommunityInfo when community exists', async () => {
    const fakeRow = createFakeDbCommunity();
    const expectedInfo = createFakeCommunityInfo({
      id: fakeRow.id,
      organizerId: fakeRow.organizer_id,
    });

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: fakeRow, error: null }),
        }),
      }),
    });

    const result = await fetchCommunityById(mockSupabase, fakeRow.id);

    expect(result?.id).toBe(fakeRow.id);
    expect(result?.organizerId).toBe(fakeRow.organizer_id);
    expect(result?.name).toBe(fakeRow.name);
  });

  it('should return null when community not found', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ 
            data: null, 
            error: { code: 'PGRST116' } 
          }),
        }),
      }),
    });

    const result = await fetchCommunityById(mockSupabase, 'nonexistent-id');

    expect(result).toBeNull();
  });

  it('should throw error on database failure', async () => {
    const dbError = new Error('Database connection failed');
    
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ 
            data: null, 
            error: dbError 
          }),
        }),
      }),
    });

    await expect(fetchCommunityById(mockSupabase, 'test-id')).rejects.toThrow(dbError);
  });
});