import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { supabase } from '@belongnetwork/core';
import { createResource } from '../impl/createResource';
import { createMockDbResource } from './test-utils';
import { AUTH_ERROR_MESSAGES } from '../../auth';

// Mock the supabase client
vi.mock('@belongnetwork/core', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
      }),
    },
  },
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('createResource', () => {
  const mockResourceData = {
    title: 'Test Resource',
    description: 'Test Description',
    category: 'FOOD' as const,
    url: 'https://example.com',
  };

  const mockCreatedResource = createMockDbResource({
    ...mockResourceData,
    owner_id: 'user-123',
    is_approved: false,
    is_active: true,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset the mock implementation for each test
    (supabase.from('').insert as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockCreatedResource,
        error: null,
      }),
    });
  });

  it('should create a new resource', async () => {
    // Arrange
    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
    });

    // Act
    const result = await createResource(mockResourceData);

    // Assert
    expect(supabase.auth.getUser).toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledWith('resources');
    expect(supabase.from('').insert).toHaveBeenCalledWith([
      expect.objectContaining({
        title: 'Test Resource',
        description: 'Test Description',
        category: 'FOOD',
        url: 'https://example.com',
        owner_id: 'user-123',
        is_approved: false,
        is_active: true,
      }),
    ]);
    expect(result).toEqual(expect.objectContaining({
      id: mockCreatedResource.id,
      title: 'Test Resource',
      ownerId: 'user-123',
    }));
  });

  it('should throw an error when user is not authenticated', async () => {
    // Arrange
    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: null },
    });

    // Act & Assert
    await expect(createResource(mockResourceData)).rejects.toThrow(
      AUTH_ERROR_MESSAGES.AUTHENTICATION_REQUIRED
    );
  });

  it('should throw an error when resource creation fails', async () => {
    // Arrange
    const mockError = new Error('Failed to create resource');
    (supabase.from('').insert as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    });

    // Act & Assert
    await expect(createResource(mockResourceData)).rejects.toThrow(mockError);
  });

  it('should include owner and community in the response when available', async () => {
    // Arrange
    const mockResourceWithRelations = {
      ...mockCreatedResource,
      owner: {
        id: 'user-123',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      },
      community: {
        id: 'comm-123',
        name: 'Test Community',
        slug: 'test-community',
      },
    };

    (supabase.from('').insert as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockResourceWithRelations,
        error: null,
      }),
    });

    // Act
    const result = await createResource(mockResourceData);

    // Assert
    expect(result.owner).toEqual({
      id: 'user-123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    });
    expect(result.community).toEqual({
      id: 'comm-123',
      name: 'Test Community',
      slug: 'test-community',
    });
  });
});
