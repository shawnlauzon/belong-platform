import { describe, it, expect } from 'vitest';
import { toCommunityInfo } from '../../transformers/communityTransformer';
import { createFakeDbCommunity } from '../../__fakes__';
import {
  assertNoSnakeCaseProperties,
  COMMON_SNAKE_CASE_PROPERTIES,
} from '@/shared/__tests__/transformerTestUtils';

describe('CommunityInfo Transformer', () => {
  it('should transform database community to CommunityInfo without snake_case properties', () => {
    // Arrange
    const dbCommunity = createFakeDbCommunity();

    // Act
    const result = toCommunityInfo(dbCommunity);

    // Assert - Should have camelCase properties
    expect(result).toMatchObject({
      name: dbCommunity.name,
      description: dbCommunity.description,
      organizerId: dbCommunity.organizer_id,
      timeZone: dbCommunity.time_zone,
      createdAt: new Date(dbCommunity.created_at),
      updatedAt: new Date(dbCommunity.updated_at),
      memberCount: dbCommunity.member_count,
    });

    // Assert - Should NOT have snake_case properties
    assertNoSnakeCaseProperties(result, [
      ...COMMON_SNAKE_CASE_PROPERTIES.ENTITY_FIELDS,
      'organizer_id',
      'time_zone',
      'member_count',
    ]);

    // Assert - Should not have nested User objects (only IDs)
    expect(result).not.toHaveProperty('organizer');
    expect(typeof result.organizerId).toBe('string');
  });

  it('should handle optional fields correctly in CommunityInfo', () => {
    // Arrange
    const dbCommunity = createFakeDbCommunity({
      boundary: null,
    });

    // Act
    const result = toCommunityInfo(dbCommunity);

    // Assert
    expect(result.boundary).toBeUndefined();
  });
});
