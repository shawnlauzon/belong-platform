import { describe, it, expect, vi } from 'vitest';
import { createMockDbProfile, createMockUser } from '../test-utils/mocks';
import { toDomainUser, toDbUser, ERROR_MESSAGES } from './userTransformer';

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
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.user_metadata?.['first_name'] || '',
        lastName: dbUser.user_metadata?.['last_name'] || undefined,
        fullName: dbUser.user_metadata?.['full_name'] || undefined,
        avatarUrl: dbUser.user_metadata?.['avatar_url'] || undefined,
        createdAt: new Date(dbUser.created_at),
        updatedAt: new Date(dbUser.updated_at),
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
        firstName: '',
        lastName: undefined,
        fullName: undefined,
        avatarUrl: undefined,
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
        firstName,
        lastName,
        fullName,
        avatarUrl,
        createdAt,
        updatedAt,
        ...userWithoutMetadata
      } = domainUser;

      expect(dbUser).toMatchObject({
        id: domainUser.id,
        email: domainUser.email,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          avatar_url: avatarUrl,
        },
        created_at: createdAt.toISOString(),
        updated_at: updatedAt.toISOString(),
      });
    });

    it('should handle partial updates', () => {
      // Create a partial domain user with only some fields
      const partialUser = {
        id: 'user123',
        firstName: 'John',
        lastName: 'Doe',
      };

      // Call the transformer
      const result = toDbUser(partialUser);

      // Verify only the specified fields are included
      expect(result).toMatchObject({
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
