import { describe, it, expect } from 'vitest';
import { toCommunityInfo } from '../../transformers/communityTransformer';
import { createMockDbCommunity } from '../../__mocks__';
import {
  assertNoSnakeCaseProperties,
  COMMON_SNAKE_CASE_PROPERTIES,
} from '@/shared/__tests__/transformerTestUtils';

describe('CommunityInfo Transformer', () => {
  it('should transform database community to CommunityInfo without snake_case properties', () => {
    // Arrange
    const dbCommunity = createMockDbCommunity({
      id: 'community-123',
      name: 'Test Community',
      description: 'A test community',
      organizer_id: 'user-123',
      time_zone: 'America/New_York',
      member_count: 150,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    });

    // Act
    const result = toCommunityInfo(dbCommunity);

    // Assert - Should have camelCase properties
    expect(result).toHaveProperty('id', 'community-123');
    expect(result).toHaveProperty('name', 'Test Community');
    expect(result).toHaveProperty('description', 'A test community');
    expect(result).toHaveProperty('organizerId', 'user-123');
    expect(result).toHaveProperty('timeZone', 'America/New_York');
    expect(result).toHaveProperty('createdAt');
    expect(result).toHaveProperty('updatedAt');
    expect(result).toHaveProperty('boundary');

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
    const dbCommunity = createMockDbCommunity({
      id: 'community-456',
      name: 'Minimal Community',
      description: null,
      organizer_id: 'user-456',
      time_zone: 'UTC',
      member_count: 1,
      boundary: null,
    });

    // Act
    const result = toCommunityInfo(dbCommunity);

    // Assert
    expect(result.name).toBe('Minimal Community');
    expect(result.description).toBeUndefined();
    expect(result.organizerId).toBe('user-456');
    expect(result.timeZone).toBe('UTC');
    expect(result.memberCount).toBe(1);
    expect(result.boundary).toBeUndefined();

    // Verify no snake_case leakage
    assertNoSnakeCaseProperties(result, [
      ...COMMON_SNAKE_CASE_PROPERTIES.ENTITY_FIELDS,
      'organizer_id',
      'time_zone',
      'member_count',
    ]);
  });
});
