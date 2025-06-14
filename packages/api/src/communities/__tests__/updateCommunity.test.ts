import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { updateCommunity } from '../impl/updateCommunity';
import { createMockDbCommunity } from '../../test-utils/mocks';
import { supabase } from '@belongnetwork/core';
import { UpdateCommunityData } from '@belongnetwork/types';

// Mock the supabase client and auth
vi.mock('@belongnetwork/core', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: faker.string.uuid() } },
      }),
    },
    from: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: null,
      error: null,
    }),
  },
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('updateCommunity', () => {
  const mockUser = { id: faker.string.uuid() };
  const communityId = faker.string.uuid();
  const updateData = {
    id: communityId,
    name: faker.company.name(),
    description: faker.lorem.sentence(),
  } as UpdateCommunityData;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
    } as any);
  });

  it('should update a community successfully', async () => {
    // Arrange
    const updatedCommunity = createMockDbCommunity(updateData);

    const mockQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: updatedCommunity,
        error: null,
      }),
    };

    vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

    // Act
    const result = await updateCommunity(updateData);

    // Assert
    expect(supabase.from).toHaveBeenCalledWith('communities');
    expect(mockQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        name: updateData.name,
        description: updateData.description,
        updated_by: mockUser.id,
      })
    );
    expect(mockQuery.eq).toHaveBeenCalledWith('id', communityId);
    expect(mockQuery.select).toHaveBeenCalledWith('*');
    expect(result).toBeDefined();
    expect(result.id).toBe(communityId);
    expect(result.name).toBe(updateData.name);
  });

  it('should throw an error when user is not authenticated', async () => {
    // Arrange
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
    } as any);

    // Act & Assert
    await expect(updateCommunity(updateData)).rejects.toThrow(
      'User must be authenticated to perform this operation'
    );
  });

  it('should throw an error when update fails', async () => {
    // Arrange
    const mockError = new Error('Failed to update community');

    const mockQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    };

    vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

    // Act & Assert
    await expect(updateCommunity(updateData)).rejects.toThrow(mockError);
  });
});
