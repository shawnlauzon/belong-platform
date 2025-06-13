import { describe, it, expect, vi } from 'vitest';
import { createMockDbProfile, createMockUser } from '../test-utils/mocks';
import { toDomainUser, toDbUser, ERROR_MESSAGES } from './userTransformers';

// Mock the current date for consistent testing
const mockDate = new Date('2023-01-01T00:00:00Z');
vi.useFakeTimers();
vi.setSystemTime(mockDate);

describe('User Transformer', () => {
  describe('toDomainUser', () => {
    it('should transform a database user to a domain user', () => {
      // Create a mock database user
      const dbUser = createMockDbProfile();

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { user_metadata, ...rest } = dbUser;

      // Call the transformer
      const domainUser = toDomainUser(dbUser);

      // Verify the transformation
      expect(domainUser).toMatchObject({
        ...rest,
        first_name: dbUser.user_metadata?.['first_name'] || '',
        last_name: dbUser.user_metadata?.['last_name'] || '',
        full_name: dbUser.user_metadata?.['full_name'] || '',
        avatar_url: dbUser.user_metadata?.['avatar_url'] || null,
        created_at: new Date(dbUser.created_at),
        updated_at: new Date(dbUser.updated_at),
      });
    });

    it('should handle missing user_metadata gracefully', () => {
      // Create a minimal database user without user_metadata
      const dbUser = createMockDbProfile({
        user_metadata: {},
      });

      // Call the transformer
      const domainUser = toDomainUser(dbUser);

      // Verify default values
      expect(domainUser).toMatchObject({
        id: dbUser.id,
        email: dbUser.email,
        first_name: '',
        last_name: undefined,
        full_name: undefined,
        avatar_url: undefined,
      });
    });

    it('should throw error for null/undefined input', () => {
      expect(() => toDomainUser(null as any)).toThrow(
        ERROR_MESSAGES.DATABASE_USER_REQUIRED
      );
      expect(() => toDomainUser(undefined as any)).toThrow(
        ERROR_MESSAGES.DATABASE_USER_REQUIRED
      );
    });
  });

  describe('toDbUser', () => {
    it('should transform a domain user to a database user', () => {
      // Create a mock domain user
      const domainUser = createMockUser();

      // Call the transformer
      const dbUser = toDbUser(domainUser);

      // Verify the transformation
      const {
        first_name,
        last_name,
        full_name,
        avatar_url,
        ...userWithoutMetadata
      } = domainUser;

      expect(dbUser).toEqual({
        ...userWithoutMetadata,
        user_metadata: {
          first_name,
          last_name,
          full_name,
          avatar_url,
        },
        created_at: domainUser.created_at.toISOString(),
        updated_at: domainUser.updated_at.toISOString(),
      });
    });

    it('should handle partial updates', () => {
      // Create a partial domain user with only some fields
      const partialUser = {
        id: 'user123',
        first_name: 'John',
        last_name: 'Doe',
      };

      // Call the transformer
      const result = toDbUser(partialUser);

      // Verify only the specified fields are included
      expect(result).toEqual({
        id: 'user123',
        user_metadata: {
          first_name: 'John',
          last_name: 'Doe',
          full_name: undefined,
          avatar_url: undefined,
        },
        created_at: undefined,
        updated_at: undefined,
      });
    });

    it('should handle empty input', () => {
      const result = toDbUser({});

      expect(result).toEqual({
        user_metadata: {
          first_name: undefined,
          last_name: undefined,
          full_name: undefined,
          avatar_url: undefined,
        },
        created_at: undefined,
        updated_at: undefined,
      });
    });
  });
});