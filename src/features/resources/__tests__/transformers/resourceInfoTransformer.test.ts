import { describe, it, expect } from 'vitest';
import { faker } from '@faker-js/faker';
import { toResourceInfo } from '../../transformers/resourceTransformer';
import { createFakeDbResource } from '../../__fakes__';
import {
  assertNoSnakeCaseProperties,
  COMMON_SNAKE_CASE_PROPERTIES,
} from '../../../../test-utils/transformerTestUtils';

describe('ResourceInfo Transformer', () => {
  it('should transform database resource to ResourceInfo without snake_case properties', () => {
    // Arrange
    const ownerId = faker.string.uuid();
    const communityId = faker.string.uuid();
    const dbResource = createFakeDbResource({
      owner_id: ownerId,
      community_id: communityId,
    });

    // Act
    const result = toResourceInfo(dbResource);

    // Assert - Should have camelCase properties
    expect(result).toHaveProperty('id', dbResource.id);
    expect(result).toHaveProperty('title', dbResource.title);
    expect(result).toHaveProperty('description', dbResource.description);
    expect(result).toHaveProperty('category', dbResource.category);
    expect(result).toHaveProperty('type', dbResource.type);
    expect(result).toHaveProperty('ownerId', ownerId);
    expect(result).toHaveProperty('communityId', communityId);
    expect(result).toHaveProperty('imageUrls');
    expect(result).toHaveProperty('createdAt');
    expect(result).toHaveProperty('updatedAt');

    // Assert - Should NOT have snake_case properties
    assertNoSnakeCaseProperties(result, [
      ...COMMON_SNAKE_CASE_PROPERTIES.ENTITY_FIELDS,
      ...COMMON_SNAKE_CASE_PROPERTIES.USER_COMMUNITY_FIELDS,
      ...COMMON_SNAKE_CASE_PROPERTIES.RESOURCE_FIELDS,
      'image_urls',
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

    const dbResource = createFakeDbResource({
      id: resourceId,
      title: title,
      description: description,
      category: 'other',
      type: 'request',
      owner_id: ownerId,
      community_id: communityId,
      image_urls: [],
      location_name: null,
      coordinates: null,
    });

    // Act
    const result = toResourceInfo(dbResource);

    // Assert
    expect(result.imageUrls).toEqual([]);
    expect(result.locationName).toBe('');
    expect(result.coordinates).toBeUndefined();

    // Verify no snake_case leakage
    assertNoSnakeCaseProperties(result, ['image_urls']);
  });
});
