import { describe, it, expect } from 'vitest';
import { faker } from '@faker-js/faker';
import {
  toDomainUser,
  forDbInsert,
  forDbUpdate,
  createUserMetadata,
} from '../../impl/userTransformer';
import type { User, UserData } from '@belongnetwork/types';
import { createMockDbProfile } from '../../../test-utils/mocks/mockDbRows';

describe('userTransformer', () => {
  describe('toDomainUser', () => {
    it('should transform a database profile to a domain user', () => {
      // Arrange
      const now = new Date().toISOString();
      const mockProfile = {
        id: faker.string.uuid(),
        email: faker.internet.email(),
        user_metadata: {
          first_name: 'John',
          last_name: 'Doe',
          full_name: 'John Doe',
          avatar_url: 'https://example.com/avatar.jpg',
          location: {
            lat: faker.location.latitude(),
            lng: faker.location.longitude(),
          },
        },
        created_at: now,
        updated_at: now,
      };

      // Act
      const result = toDomainUser(mockProfile);

      // Assert
      expect(result).toEqual({
        id: mockProfile.id,
        email: mockProfile.email,
        firstName: 'John',
        lastName: 'Doe',
        fullName: 'John Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
        location: mockProfile.user_metadata.location,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      });
    });

    it('should handle missing optional fields', () => {
      // Arrange
      const now = new Date().toISOString();
      const mockProfile = {
        id: faker.string.uuid(),
        email: faker.internet.email(),
        user_metadata: {},
        created_at: now,
        updated_at: now,
      };

      // Act
      const result = toDomainUser(mockProfile);

      // Assert
      expect(result).toEqual({
        id: mockProfile.id,
        email: mockProfile.email,
        firstName: '',
        lastName: undefined,
        fullName: undefined,
        avatarUrl: undefined,
        location: undefined,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      });
    });

    it('should throw an error when profile is null or undefined', () => {
      // Act & Assert
      expect(() => toDomainUser(null as any)).toThrow('Profile is required');
      expect(() => toDomainUser(undefined as any)).toThrow(
        'Profile is required'
      );
    });

    it('should not return any field names with underscores', () => {
      // Arrange
      const mockProfile = createMockDbProfile();

      // Act
      const result = toDomainUser(mockProfile);

      // Assert
      const fieldNames = Object.keys(result);
      const underscoreFields = fieldNames.filter(name => name.includes('_'));
      expect(underscoreFields).toEqual([]);
    });
  });

  describe('forDbInsert', () => {
    it('should transform user data for database insertion', () => {
      // Arrange
      const userData: UserData & { id: string } = {
        id: faker.string.uuid(),
        email: faker.internet.email(),
        firstName: 'Jane',
        lastName: 'Smith',
        fullName: 'Jane Smith',
        avatarUrl: 'https://example.com/avatar2.jpg',
        location: {
          lat: faker.location.latitude(),
          lng: faker.location.longitude(),
        },
      };

      // Act
      const result = forDbInsert(userData);

      // Assert
      expect(result).toEqual({
        id: userData.id,
        email: userData.email,
        user_metadata: {
          first_name: 'Jane',
          last_name: 'Smith',
          full_name: 'Jane Smith',
          avatar_url: 'https://example.com/avatar2.jpg',
          location: userData.location,
        },
      });
    });

    it('should handle missing optional fields', () => {
      // Arrange
      const userData: UserData & { id: string } = {
        id: faker.string.uuid(),
        email: faker.internet.email(),
        firstName: 'Jane',
      };

      // Act
      const result = forDbInsert(userData);

      // Assert
      expect(result).toEqual({
        id: userData.id,
        email: userData.email,
        user_metadata: {
          first_name: 'Jane',
          last_name: undefined,
          full_name: undefined,
          avatar_url: undefined,
          location: undefined,
        },
      });
    });
  });

  describe('forDbUpdate', () => {
    it('should transform user data for database update', () => {
      // Arrange
      const userData: Partial<UserData> & { id: string } = {
        id: faker.string.uuid(),
        firstName: 'Updated',
        lastName: 'Name',
      };

      // Act
      const result = forDbUpdate(userData);

      // Assert
      expect(result).toEqual({
        user_metadata: {
          first_name: 'Updated',
          last_name: 'Name',
          full_name: undefined,
          avatar_url: undefined,
          location: undefined,
        },
        updated_at: expect.any(String),
      });
    });
  });

  describe('createUserMetadata', () => {
    it('should create user metadata from user data', () => {
      // Arrange
      const userData: Partial<UserData> = {
        firstName: 'Test',
        lastName: 'User',
        fullName: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        location: {
          lat: faker.location.latitude(),
          lng: faker.location.longitude(),
        },
      };

      // Act
      const result = createUserMetadata(userData);

      // Assert
      expect(result).toEqual({
        first_name: 'Test',
        last_name: 'User',
        full_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        location: userData.location,
      });
    });

    it('should handle missing fields', () => {
      // Act
      const result = createUserMetadata({});

      // Assert
      expect(result).toEqual({
        first_name: undefined,
        last_name: undefined,
        full_name: undefined,
        avatar_url: undefined,
        location: undefined,
      });
    });
  });
});
