import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { createCommunity } from '../impl/createCommunity';
import { createMockDbCommunity } from '../../test-utils/mocks';
import { supabase } from '@belongnetwork/core';
import { CreateCommunityData } from '@belongnetwork/types';

// Mock the supabase client and auth
vi.mock('@belongnetwork/core', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: faker.string.uuid() } },
      }),
    },
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
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

describe('createCommunity', () => {
  const mockUser = { id: faker.string.uuid() };
  const communityData = {
    name: faker.company.name(),
    description: faker.lorem.sentence(),
  } as CreateCommunityData;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
    } as any);
  });

  it('should create a community successfully', async () => {
    // Arrange
    const mockCommunity = createMockDbCommunity(communityData);

    const mockQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockCommunity,
        error: null,
      }),
    };

    vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

    // Act
    const result = await createCommunity(communityData);

    // Assert
    expect(supabase.from).toHaveBeenCalledWith('communities');
    expect(mockQuery.insert).toHaveBeenCalledWith(communityData);
    expect(mockQuery.select).toHaveBeenCalledWith('*');
    expect(result).toBeDefined();
    expect(result.name).toBe(communityData.name);
  });

  it('should throw an error when user is not authenticated', async () => {
    // Arrange
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
    } as any);

    // Act & Assert
    await expect(createCommunity(communityData)).rejects.toThrow(
      'User must be authenticated to perform this operation'
    );
  });

  it('should throw an error when creation fails', async () => {
    // Arrange
    const mockError = new Error('Failed to create community');

    const mockQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    };

    vi.mocked(supabase.from).mockReturnValue(mockQuery as any);

    // Act & Assert
    await expect(createCommunity(communityData)).rejects.toThrow(mockError);
  });
});
