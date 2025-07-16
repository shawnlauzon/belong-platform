import { describe, it, expect } from 'vitest';
import { toDomainCommunitySummary } from '../../transformers/communityTransformer';
import { createFakeCommunityRow } from '../../__fakes__';
import {
  assertNoSnakeCaseProperties,
  COMMON_SNAKE_CASE_PROPERTIES,
} from '@/test-utils/transformerTestUtils';

describe('Community Summary Transformer', () => {
  it('should transform database community to CommunitySummary without snake_case properties', () => {
    // Arrange
    const dbCommunity = createFakeCommunityRow();

    // Act
    const result = toDomainCommunitySummary(dbCommunity);

    // Assert - Should have camelCase properties
    expect(result).toMatchObject({
      name: dbCommunity.name,
      type: dbCommunity.type,
      icon: dbCommunity.icon ?? undefined,
      memberCount: dbCommunity.member_count,
    });

    // Assert - Should NOT have snake_case properties
    assertNoSnakeCaseProperties(result, [
      ...COMMON_SNAKE_CASE_PROPERTIES.ENTITY_FIELDS,
      'member_count',
    ]);
  });

  it('should handle optional fields correctly in CommunitySummary', () => {
    // Arrange
    const dbCommunity = createFakeCommunityRow({
      icon: null,
    });

    // Act
    const result = toDomainCommunitySummary(dbCommunity);

    // Assert
    expect(result.icon).toBeUndefined();
  });
});
