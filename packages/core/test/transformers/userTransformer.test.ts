import { describe, it, expect, vi } from 'vitest';
import { toDomainUser, toDbUser } from '../../src/transformers/userTransformer';
import { createMockUser, createMockDbProfile } from '@belongnetwork/core';

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
      const result = toDomainUser(dbUser);

      // Verify the transformation
      expect(result).toMatchObject({
        ...rest,
        first_name: dbUser.user_metadata?.['first_name'] || '',
        last_name: dbUser.user_metadata?.['last_name'] || '',
        avatar_url: dbUser.user_metadata?.['avatar_url'] || null,
      });
    });

    it('should handle missing optional fields with defaults', () => {
      // Create a minimal database user
      const dbUser = {
        id: 'user123',
        email: 'test@example.com',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        user_metadata: {},
      };

      // Call the transformer
      const result = toDomainUser(dbUser);

      // Verify default values
      expect(result).toMatchObject({
        id: 'user123',
        email: 'test@example.com',
        first_name: '',
        last_name: '',
        avatar_url: null,
      });
    });
  });

  describe('toDbUser', () => {
    it('should transform a domain user to a database user', () => {
      // Create a mock domain user
      const domainUser = createMockUser();

      // Call the transformer
      const result = toDbUser(domainUser);

      // Verify the transformation
      expect(result).toEqual({
        ...domainUser,
        user_metadata: {
          first_name: domainUser.first_name,
          last_name: domainUser.last_name,
          avatar_url: domainUser.avatar_url,
        },
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
        },
      });
    });
  });
});
