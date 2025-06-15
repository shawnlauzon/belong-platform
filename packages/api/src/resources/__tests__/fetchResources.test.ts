import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { supabase } from '@belongnetwork/core';
import { fetchResources, fetchResourceById } from '../impl/fetchResources';
import { createMockDbResource } from './test-utils';

// Mock the supabase client
vi.mock('@belongnetwork/core', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: faker.string.uuid() } },
      }),
    },
  },
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('fetchResources', () => {
  const mockResources = Array(3).fill(null).map(() => createMockDbResource());

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset the mock implementation for each test
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockResources[0], error: null }),
    });
  });

  it('should fetch all resources', async () => {
    // Arrange
    (supabase.from('').select().order() as any).mockResolvedValueOnce({
      data: mockResources,
      error: null,
    });

    // Act
    const result = await fetchResources();

    // Assert
    expect(supabase.from).toHaveBeenCalledWith('resources');
    expect(supabase.from('').select).toHaveBeenCalledWith('*, owner:profiles(*), community:communities(*)');
    expect(supabase.from('').order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe(mockResources[0].id);
  });

  it('should apply filters when provided', async () => {
    // Arrange
    const filters = {
      communityId: faker.string.uuid(),
      category: 'FOOD',
      isApproved: true,
      isActive: true,
    };

    (supabase.from('').select().order() as any).mockImplementation(() => ({
      eq: (key: string, value: any) => ({
        eq: (k: string, v: any) => ({
          eq: (k2: string, v2: any) => ({
            eq: (k3: string, v3: any) => ({
              data: mockResources.filter(
                (r) =>
                  r.community_id === filters.communityId &&
                  r.category === filters.category &&
                  r.is_approved === filters.isApproved &&
                  r.is_active === filters.isActive
              ),
              error: null,
            })
          })
        })
      })
    }));

    // Act
    const result = await fetchResources(filters);

    // Assert
    expect(supabase.from).toHaveBeenCalledWith('resources');
    expect(supabase.from('').select).toHaveBeenCalledWith('*, owner:profiles(*), community:communities(*)');
    expect(result).toHaveLength(3); // All mock resources match the filter in this test
  });

  it('should throw an error when fetching resources fails', async () => {
    // Arrange
    const mockError = new Error('Failed to fetch resources');
    (supabase.from('').select().order() as any).mockRejectedValueOnce(mockError);

    // Act & Assert
    await expect(fetchResources()).rejects.toThrow(mockError);
  });
});

describe('fetchResourceById', () => {
  const mockResource = createMockDbResource();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch a resource by ID', async () => {
    // Arrange
    (supabase.from('').select().eq().single as any).mockResolvedValueOnce({
      data: mockResource,
      error: null,
    });

    // Act
    const result = await fetchResourceById(mockResource.id);

    // Assert
    expect(supabase.from).toHaveBeenCalledWith('resources');
    expect(supabase.from('').select).toHaveBeenCalledWith('*, owner:profiles(*), community:communities(*)');
    expect(supabase.from('').eq).toHaveBeenCalledWith('id', mockResource.id);
    expect(supabase.from('').single).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ id: mockResource.id }));
  });

  it('should return null when resource is not found', async () => {
    // Arrange
    (supabase.from('').select().eq().single as any).mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116' }, // Not found error code
    });

    // Act
    const result = await fetchResourceById('non-existent-id');

    // Assert
    expect(result).toBeNull();
  });

  it('should throw an error when fetching fails', async () => {
    // Arrange
    const mockError = new Error('Failed to fetch resource');
    (supabase.from('').select().eq().single as any).mockRejectedValueOnce(mockError);

    // Act & Assert
    await expect(fetchResourceById('some-id')).rejects.toThrow(mockError);
  });
});
