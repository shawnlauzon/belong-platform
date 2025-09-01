import { describe, it, expect } from 'vitest';
import { faker } from '@faker-js/faker';
import {
  toCurrentUser,
  toCurrentUserInsertRow,
  toCurrentUserUpdateRow,
} from '../../transformers/userTransformer';
import { createFakeProfileRow, createFakeCurrentUserInput } from '../../__fakes__';
import {
  assertNoSnakeCaseProperties,
  COMMON_SNAKE_CASE_PROPERTIES,
} from '../../../../test-utils/transformerTestUtils';

describe('User Transformer', () => {
  it('should transform database profile to User without snake_case properties', () => {
    // Arrange
    const userId = faker.string.uuid();
    const email = faker.internet.email();
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const fullName = `${firstName} ${lastName}`;
    const avatarUrl = faker.internet.url();
    const location = {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    };

    const dbProfile = createFakeProfileRow({
      id: userId,
      email: email,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        avatar_url: avatarUrl,
        location: location,
      },
    });

    // Act
    const result = toCurrentUser(dbProfile);

    // Assert - Should have camelCase properties
    expect(result).toMatchObject({
      id: userId,
      email: email,
      firstName: firstName,
      lastName: lastName,
      fullName: fullName,
      avatarUrl: avatarUrl,
      location: location,
    });

    // Assert - Should NOT have snake_case properties
    assertNoSnakeCaseProperties(result, [
      ...COMMON_SNAKE_CASE_PROPERTIES.ENTITY_FIELDS,
      'first_name',
      'last_name',
      'full_name',
      'avatar_url',
      'user_metadata',
    ]);
  });

  it('should transform bio field from user_metadata', () => {
    // Arrange
    const bio = faker.lorem.paragraph();
    const dbProfile = createFakeProfileRow({
      user_metadata: {
        first_name: faker.person.firstName(),
        bio: bio,
      },
    });

    // Act
    const result = toCurrentUser(dbProfile);

    // Assert
    expect(result.bio).toBe(bio);
  });

  it('should handle optional fields correctly in User', () => {
    // Arrange
    const dbProfile = createFakeProfileRow({
      user_metadata: {
        first_name: faker.person.firstName(),
        last_name: null,
        full_name: null,
        avatar_url: null,
        location: null,
      },
    });

    // Act
    const result = toCurrentUser(dbProfile);

    // Assert
    expect(result.lastName).toBeUndefined();
    expect(result.fullName).toBeUndefined();
    expect(result.avatarUrl).toBeUndefined();
    expect(result.location).toBeUndefined();

    // Verify no snake_case leakage
    assertNoSnakeCaseProperties(result, [
      'first_name',
      'last_name',
      'full_name',
      'avatar_url',
    ]);
  });

  describe('toCurrentUserInsertRow', () => {
    it('should transform domain user to database format', () => {
      // Arrange
      const userData = createFakeCurrentUserInput();

      // Act
      const dbData = toCurrentUserInsertRow({ ...userData, id: faker.string.uuid() });

      // Assert
      expect(dbData).toMatchObject({
        email: userData.email,
        user_metadata: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          full_name: userData.fullName,
          avatar_url: userData.avatarUrl,
          location: userData.location,
          bio: userData.bio,
        },
      });
    });

    it('should handle minimal user data for database insert', () => {
      // Arrange
      const userData = createFakeCurrentUserInput({
        lastName: undefined,
        fullName: undefined,
        avatarUrl: undefined,
        location: undefined,
        bio: undefined,
      });

      // Act
      const dbData = toCurrentUserInsertRow({ ...userData, id: faker.string.uuid() });

      // Assert
      expect(dbData).toMatchObject({
        email: userData.email,
        user_metadata: {
          first_name: userData.firstName,
          last_name: undefined,
          full_name: undefined,
          avatar_url: undefined,
          location: undefined,
          bio: undefined,
        },
      });
    });
  });

  describe('toCurrentUserUpdateRow', () => {
    it('should prepare partial update data for database', () => {
      // Arrange
      const userId = faker.string.uuid();
      const currentProfile = createFakeProfileRow({
        id: userId,
        user_metadata: {
          first_name: 'John',
          last_name: 'Doe',
          full_name: 'John Doe',
          avatar_url: 'https://example.com/avatar.jpg',
          location: { lat: 40.7128, lng: -74.006 },
        },
      });

      const partialUpdate = {
        id: userId,
        firstName: 'Jane',
      };

      // Act
      const dbData = toCurrentUserUpdateRow(partialUpdate, currentProfile);

      // Assert - Should only update firstName, preserve other fields
      expect(dbData.user_metadata).toEqual({
        first_name: 'Jane',
        last_name: 'Doe',
        full_name: 'John Doe',
        avatar_url: 'https://example.com/avatar.jpg',
        location: { lat: 40.7128, lng: -74.006 },
      });
      expect(dbData.updated_at).toBeDefined();
    });

    it('should handle bio field updates', () => {
      // Arrange
      const userId = faker.string.uuid();
      const newBio = faker.lorem.paragraph();
      const currentProfile = createFakeProfileRow({
        id: userId,
        user_metadata: {
          first_name: 'John',
          last_name: 'Doe',
          bio: 'Original bio',
        },
      });

      const partialUpdate = {
        id: userId,
        bio: newBio,
      };

      // Act
      const dbData = toCurrentUserUpdateRow(partialUpdate, currentProfile);

      // Assert - Should update bio, preserve other fields
      expect(dbData.user_metadata).toEqual({
        first_name: 'John',
        last_name: 'Doe',
        bio: newBio,
      });
      expect(dbData.updated_at).toBeDefined();
    });

    it('should handle multiple field updates', () => {
      // Arrange
      const userId = faker.string.uuid();
      const currentProfile = createFakeProfileRow({
        id: userId,
        user_metadata: {
          first_name: 'John',
          last_name: 'Doe',
          full_name: 'John Doe',
          avatar_url: 'https://example.com/avatar.jpg',
          location: { lat: 40.7128, lng: -74.006 },
        },
      });

      const partialUpdate = {
        id: userId,
        firstName: 'Jane',
        lastName: 'Smith',
        fullName: 'Jane Smith',
      };

      // Act
      const dbData = toCurrentUserUpdateRow(partialUpdate, currentProfile);

      // Assert
      expect(dbData.user_metadata).toEqual({
        first_name: 'Jane',
        last_name: 'Smith',
        full_name: 'Jane Smith',
        avatar_url: 'https://example.com/avatar.jpg',
        location: { lat: 40.7128, lng: -74.006 },
      });
    });

    it('should handle undefined values by preserving existing data', () => {
      // Arrange
      const userId = faker.string.uuid();
      const currentProfile = createFakeProfileRow({
        id: userId,
        user_metadata: {
          first_name: 'John',
          last_name: 'Doe',
          full_name: 'John Doe',
          avatar_url: 'https://example.com/avatar.jpg',
          location: { lat: 40.7128, lng: -74.006 },
        },
      });

      const partialUpdate = {
        id: userId,
        firstName: 'Jane',
        lastName: undefined, // Should be ignored
        avatarUrl: undefined, // Should be ignored
      };

      // Act
      const dbData = toCurrentUserUpdateRow(partialUpdate, currentProfile);

      // Assert - undefined values should be ignored
      expect(dbData.user_metadata).toEqual({
        first_name: 'Jane',
        last_name: 'Doe',
        full_name: 'John Doe',
        avatar_url: 'https://example.com/avatar.jpg',
        location: { lat: 40.7128, lng: -74.006 },
      });
    });

    it('should handle empty partial update', () => {
      // Arrange
      const userId = faker.string.uuid();
      const currentProfile = createFakeProfileRow({
        id: userId,
        user_metadata: {
          first_name: 'John',
          last_name: 'Doe',
          full_name: 'John Doe',
          avatar_url: 'https://example.com/avatar.jpg',
          location: { lat: 40.7128, lng: -74.006 },
        },
      });

      const partialUpdate = {
        id: userId,
      };

      // Act
      const dbData = toCurrentUserUpdateRow(partialUpdate, currentProfile);

      // Assert - Should preserve all existing data
      expect(dbData.user_metadata).toEqual({
        first_name: 'John',
        last_name: 'Doe',
        full_name: 'John Doe',
        avatar_url: 'https://example.com/avatar.jpg',
        location: { lat: 40.7128, lng: -74.006 },
      });
    });

    it('should work when current profile has empty user_metadata', () => {
      // Arrange
      const userId = faker.string.uuid();
      const currentProfile = createFakeProfileRow({
        id: userId,
        user_metadata: {},
      });

      const partialUpdate = {
        id: userId,
        firstName: 'Jane',
        lastName: 'Smith',
      };

      // Act
      const dbData = toCurrentUserUpdateRow(partialUpdate, currentProfile);

      // Assert
      expect(dbData.user_metadata).toEqual({
        first_name: 'Jane',
        last_name: 'Smith',
      });
    });
  });
});
