import { describe, it, expect } from 'vitest';
import { toShoutoutInfo } from '../transformers/shoutoutsTransformer';
import { createMockDbShoutout } from '../__mocks__';
import { 
  assertNoSnakeCaseProperties, 
  COMMON_SNAKE_CASE_PROPERTIES 
} from '../../../shared/__test__/transformerTestUtils';

describe('ShoutoutInfo Transformer', () => {
  it('should transform database shoutout to ShoutoutInfo without snake_case properties', () => {
    // Arrange
    const dbShoutout = createMockDbShoutout({
      id: 'shoutout-123',
      message: 'Shoutout so much!',
      from_user_id: 'user-123',
      to_user_id: 'user-456',
      resource_id: 'resource-789',
      image_urls: ['shoutout1.jpg', 'shoutout2.jpg'],
      impact_description: 'This really helped me fix my bike',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    });

    // Act
    const result = toShoutoutInfo(
      dbShoutout,
      'user-123',
      'user-456',
      'resource-789'
    );

    // Assert - Should have camelCase properties
    expect(result).toHaveProperty('id', 'shoutout-123');
    expect(result).toHaveProperty('message', 'Shoutout so much!');
    expect(result).toHaveProperty('fromUserId', 'user-123');
    expect(result).toHaveProperty('toUserId', 'user-456');
    expect(result).toHaveProperty('resourceId', 'resource-789');
    expect(result).toHaveProperty('imageUrls', [
      'shoutout1.jpg',
      'shoutout2.jpg',
    ]);
    expect(result).toHaveProperty(
      'impactDescription',
      'This really helped me fix my bike'
    );
    expect(result).toHaveProperty('createdAt');
    expect(result).toHaveProperty('updatedAt');

    // Assert - Should NOT have snake_case properties
    assertNoSnakeCaseProperties(result, [
      ...COMMON_SNAKE_CASE_PROPERTIES.ENTITY_FIELDS,
      'from_user_id',
      'to_user_id',
      'resource_id',
      'image_urls',
      'impact_description'
    ]);

    // Assert - Should not have nested objects
    expect(result).not.toHaveProperty('fromUser');
    expect(result).not.toHaveProperty('toUser');
    expect(result).not.toHaveProperty('resource');
  });

  it('should handle optional fields correctly in ShoutoutInfo', () => {
    // Arrange
    const dbShoutout = createMockDbShoutout({
      id: 'shoutout-456',
      message: 'Simple shoutout',
      from_user_id: 'user-456',
      to_user_id: 'user-789',
      resource_id: 'resource-123',
      image_urls: [],
      impact_description: undefined,
    });

    // Act
    const result = toShoutoutInfo(
      dbShoutout,
      'user-456',
      'user-789',
      'resource-123'
    );

    // Assert
    expect(result.message).toBe('Simple shoutout');
    expect(result.imageUrls).toEqual([]);
    expect(result.impactDescription).toBeUndefined();
    expect(result.fromUserId).toBe('user-456');
    expect(result.toUserId).toBe('user-789');
    expect(result.resourceId).toBe('resource-123');

    // Verify no snake_case leakage
    assertNoSnakeCaseProperties(result, [
      'image_urls',
      'impact_description',
      'from_user_id',
      'to_user_id',
      'resource_id'
    ]);
  });
});
