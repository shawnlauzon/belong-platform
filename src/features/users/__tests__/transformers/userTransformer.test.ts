import { describe, it, expect } from 'vitest';
import { faker } from '@faker-js/faker';
import { toDomainUser, forDbInsert } from '../../transformers/userTransformer';
import { createMockDbProfile, createMockUserData } from '../../__mocks__';
import {
  assertNoSnakeCaseProperties,
  COMMON_SNAKE_CASE_PROPERTIES,
} from '../../../../shared/__tests__/transformerTestUtils';

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

    const dbProfile = createMockDbProfile({
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
    const result = toDomainUser(dbProfile);

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

  it('should handle optional fields correctly in User', () => {
    // Arrange
    const dbProfile = createMockDbProfile({
      user_metadata: {
        first_name: faker.person.firstName(),
        last_name: null,
        full_name: null,
        avatar_url: null,
        location: null,
      },
    });

    // Act
    const result = toDomainUser(dbProfile);

    // Assert
    expect(result.lastName).toBeNull();
    expect(result.fullName).toBeNull();
    expect(result.avatarUrl).toBeNull();
    expect(result.location).toBeNull();

    // Verify no snake_case leakage
    assertNoSnakeCaseProperties(result, [
      'first_name',
      'last_name',
      'full_name',
      'avatar_url',
    ]);
  });

  describe('forDbInsert', () => {
    it('should transform domain user to database format', () => {
      // Arrange
      const userData = createMockUserData();

      // Act
      const dbData = forDbInsert(userData);

      // Assert
      expect(dbData).toMatchObject({
        id: userData.id,
        email: userData.email,
        user_metadata: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          full_name: userData.fullName,
          avatar_url: userData.avatarUrl,
          location: userData.location,
        },
      });
    });

    it('should handle minimal user data for database insert', () => {
      // Arrange
      const userData = createMockUserData({
        lastName: undefined,
        fullName: undefined,
        avatarUrl: undefined,
        location: undefined,
      });

      // Act
      const dbData = forDbInsert(userData);

      // Assert
      expect(dbData).toMatchObject({
        id: userData.id,
        email: userData.email,
        user_metadata: {
          first_name: userData.firstName,
          last_name: undefined,
          full_name: undefined,
          avatar_url: undefined,
          location: undefined,
        },
      });
    });
  });
});
