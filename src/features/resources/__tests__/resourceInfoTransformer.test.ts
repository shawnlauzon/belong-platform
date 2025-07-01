import { describe, it, expect } from 'vitest';
import { faker } from '@faker-js/faker';
import { toResourceInfo } from '../transformers/resourceTransformer';
import { createMockDbResource } from '../__mocks__';
import {
  assertNoSnakeCaseProperties,
  COMMON_SNAKE_CASE_PROPERTIES,
} from '../../../shared/__tests__/transformerTestUtils';

describe('ResourceInfo Transformer', () => {
  it('should transform database resource to ResourceInfo without snake_case properties', () => {
    // Arrange
    const dbResource = createMockDbResource();
    const ownerId = faker.string.uuid();
    const communityId = faker.string.uuid();

    // Act
    const result = toResourceInfo(dbResource, ownerId, communityId);

    // Assert - Should have camelCase properties
    expect(result).toHaveProperty('id', dbResource.id);
    expect(result).toHaveProperty('title', dbResource.title);
    expect(result).toHaveProperty('description', dbResource.description);
    expect(result).toHaveProperty('category', dbResource.category);
    expect(result).toHaveProperty('type', dbResource.type);
    expect(result).toHaveProperty('ownerId', ownerId);
    expect(result).toHaveProperty('communityId', communityId);
    expect(result).toHaveProperty('isActive', dbResource.is_active);
    expect(result).toHaveProperty('imageUrls');
    expect(result).toHaveProperty('pickupInstructions');
    expect(result).toHaveProperty('parkingInfo');
    expect(result).toHaveProperty('meetupFlexibility');
    expect(result).toHaveProperty('createdAt');
    expect(result).toHaveProperty('updatedAt');

    // Assert - Should NOT have snake_case properties
    assertNoSnakeCaseProperties(result, [
      ...COMMON_SNAKE_CASE_PROPERTIES.ENTITY_FIELDS,
      ...COMMON_SNAKE_CASE_PROPERTIES.USER_COMMUNITY_FIELDS,
      ...COMMON_SNAKE_CASE_PROPERTIES.RESOURCE_FIELDS,
      'image_urls',
      'pickup_instructions',
      'meetup_flexibility',
    ]);

    // Assert - Should not have nested objects
    expect(result).not.toHaveProperty('owner');
    expect(result).not.toHaveProperty('community');
  });

  it('should handle optional fields correctly in ResourceInfo', () => {
    // Arrange
    const resourceId = faker.string.uuid();
    const title = faker.commerce.productName();
    const description = faker.lorem.sentence();
    const ownerId = faker.string.uuid();
    const communityId = faker.string.uuid();

    const dbResource = createMockDbResource({
      id: resourceId,
      title: title,
      description: description,
      category: 'other',
      type: 'request',
      owner_id: ownerId,
      community_id: communityId,
      is_active: false,
      image_urls: [],
      pickup_instructions: null,
      parking_info: null,
      meetup_flexibility: null,
      location: null,
      availability: null,
    });

    // Act
    const result = toResourceInfo(dbResource, ownerId, communityId);

    // Assert
    expect(result.imageUrls).toEqual([]);
    expect(result.pickupInstructions).toBeUndefined();
    expect(result.parkingInfo).toBeUndefined();
    expect(result.location).toBeUndefined();
    expect(result.availability).toBe('available'); // Default value
    expect(result.isActive).toBe(false);

    // Verify no snake_case leakage
    assertNoSnakeCaseProperties(result, [
      'image_urls',
      'pickup_instructions',
      'parking_info',
    ]);
  });
});
