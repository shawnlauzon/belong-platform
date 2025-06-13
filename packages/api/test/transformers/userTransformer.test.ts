import { describe, it, expect, vi } from 'vitest';

import { createMockDbProfile, createMockUser } from '../../src/test-utils';
import { useUserTransformers } from '../../src/transformers/useUserTransformers';
import { renderHook } from '@testing-library/react';
import { createMockStore } from '../../src/test-utils';
import { BelongState } from '../../src/stores/types';
import { useBelongStore } from '../../src/stores';

// Mock the current date for consistent testing
const mockDate = new Date('2023-01-01T00:00:00Z');
vi.useFakeTimers();
vi.setSystemTime(mockDate);

// Mock the store
vi.mock('../../src/stores', () => ({
  useBelongStore: vi.fn(),
}));

let mockStore: BelongState;

beforeAll(() => {
  mockStore = createMockStore();
});

// Setup store mock implementation
beforeEach(() => {
  // @ts-expect-error Mock implementation
  useBelongStore.mockImplementation((selector) => selector(mockStore));
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe('User Transformer', () => {
  describe('toDomainUser', () => {
    it('should transform a database user to a domain user', () => {
      // Create a mock database user
      const dbUser = createMockDbProfile();

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { user_metadata, ...rest } = dbUser;

      // Get the transformer function from the hook
      const { result } = renderHook(() => useUserTransformers());
      const { toDomainUser } = result.current;

      // Call the transformer
      const domainUser = toDomainUser(dbUser);

      // Verify the transformation
      expect(domainUser).toMatchObject({
        ...rest,
        first_name: dbUser.user_metadata?.['first_name'] || '',
        last_name: dbUser.user_metadata?.['last_name'] || '',
        avatar_url: dbUser.user_metadata?.['avatar_url'] || null,
        created_at: new Date(dbUser.created_at),
        updated_at: new Date(dbUser.updated_at),
      });
    });

    // it('should handle missing optional fields with defaults', () => {
    //   // Create a minimal database user
    //   const dbUser = {
    //     id: 'user123',
    //     email: 'test@example.com',
    //     created_at: '2023-01-01T00:00:00.000Z',
    //     updated_at: '2023-01-01T00:00:00.000Z',
    //     user_metadata: {},
    //   };

    //   // Call the transformer
    //   const result = toDomainUser(dbUser);

    //   // Verify default values
    //   expect(result).toMatchObject({
    //     id: 'user123',
    //     email: 'test@example.com',
    //     first_name: '',
    //     last_name: '',
    //     avatar_url: null,
    //   });
    // });
  });

  describe('toDbUser', () => {
    it('should transform a domain user to a database user', () => {
      // Create a mock domain user
      const domainUser = createMockUser();

      // Get the transformer function from the hook
      const { result } = renderHook(() => useUserTransformers());
      const { toDbUser } = result.current;

      // Call the transformer
      const dbUser = toDbUser(domainUser);

      // Verify the transformation
      const { first_name, last_name, avatar_url, ...userWithoutMetadata } =
        domainUser;

      expect(dbUser).toEqual({
        ...userWithoutMetadata,
        user_metadata: {
          first_name,
          last_name,
          avatar_url,
        },
        created_at: domainUser.created_at.toISOString(),
        updated_at: domainUser.updated_at.toISOString(),
      });
    });

    // it('should handle partial updates', () => {
    //   // Create a partial domain user with only some fields
    //   const partialUser = {
    //     id: 'user123',
    //     first_name: 'John',
    //     last_name: 'Doe',
    //   };

    //   // Call the transformer
    //   const result = toDbUser(partialUser);

    //   // Verify only the specified fields are included
    //   expect(result).toEqual({
    //     id: 'user123',
    //     user_metadata: {
    //       first_name: 'John',
    //       last_name: 'Doe',
    //     },
    //   });
    // });
  });
});
