import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { deleteCommunity } from '../impl/deleteCommunity';
import { supabase } from '@belongnetwork/core';

// Mock the supabase client and auth
vi.mock('@belongnetwork/core', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: faker.string.uuid() } },
      }),
    },
    from: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  },
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('deleteCommunity', () => {
  const mockUser = { id: faker.string.uuid() };
  const communityId = faker.string.uuid();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
    } as any);

    // Mock successful deletion by default
    vi.mocked(supabase.from('').delete().eq).mockResolvedValue({
      data: null,
      error: null,
    } as any);
  });

  it('should delete a community successfully', async () => {
    // Act
    await deleteCommunity(communityId);

    // Assert
    expect(supabase.from).toHaveBeenCalledWith('communities');
    expect(supabase.from('').delete).toHaveBeenCalled();
    // expect(supabase.from('').eq).toHaveBeenCalledWith('id', communityId);
  });

  it('should throw an error when user is not authenticated', async () => {
    // Arrange
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
    } as any);

    // Act & Assert
    await expect(deleteCommunity(communityId)).rejects.toThrow(
      'User must be authenticated to perform this operation'
    );
  });

  it('should throw an error when deletion fails', async () => {
    // Arrange
    const mockError = new Error('Failed to delete community');

    vi.mocked(supabase.from('').delete().eq).mockResolvedValue({
      data: null,
      error: mockError,
    } as any);

    // Act & Assert
    await expect(deleteCommunity(communityId)).rejects.toThrow(mockError);
  });
});
