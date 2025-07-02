import { describe, it, expect } from 'vitest';
import { toCommunityInfo } from '../transformers/communityTransformer';
import { createMockDbCommunity } from '../__mocks__';
import {
  assertNoSnakeCaseProperties,
  COMMON_SNAKE_CASE_PROPERTIES,
} from '../../../shared/__tests__/transformerTestUtils';

describe('CommunityInfo Transformer', () => {
  it('should transform database community to CommunityInfo without snake_case properties', () => {
    // Arrange
    const dbCommunity = createMockDbCommunity({
      id: 'community-123',
      name: 'Test Community',
      description: 'A test community',
      organizer_id: 'user-123',
      parent_id: 'parent-community-456',
      center: 'POINT(-73.9857 40.7484)',
      radius_km: 10,
      hierarchy_path: JSON.stringify([
        { level: 'country', name: 'United States' },
        { level: 'state', name: 'New York' },
      ]),
      time_zone: 'America/New_York',
      member_count: 150,
      deleted_at: null,
      deleted_by: null,
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
    expect(result).toHaveProperty('parentId', 'parent-community-456');
    expect(result).toHaveProperty('center');
    expect(result).toHaveProperty('radiusKm', 10);
    expect(result).toHaveProperty('hierarchyPath');
    expect(result).toHaveProperty('timeZone', 'America/New_York');
    expect(result).toHaveProperty('memberCount', 150);
    expect(result).toHaveProperty('deletedAt', undefined);
    expect(result).toHaveProperty('deletedBy', undefined);
    expect(result).toHaveProperty('createdAt');
    expect(result).toHaveProperty('updatedAt');

    // Assert - Should NOT have snake_case properties
    assertNoSnakeCaseProperties(result, [
      ...COMMON_SNAKE_CASE_PROPERTIES.ENTITY_FIELDS,
      ...COMMON_SNAKE_CASE_PROPERTIES.USER_COMMUNITY_FIELDS,
      ...COMMON_SNAKE_CASE_PROPERTIES.COMMUNITY_FIELDS,
    ]);

    // Assert - Should not have nested objects
    expect(result).not.toHaveProperty('organizer');
    expect(result).not.toHaveProperty('parent');

    // Assert proper hierarchy path parsing
    expect(result.hierarchyPath).toEqual([
      { level: 'country', name: 'United States' },
      { level: 'state', name: 'New York' },
    ]);
  });

  it('should handle optional fields correctly in CommunityInfo', () => {
    // Arrange
    const dbCommunity = createMockDbCommunity({
      id: 'community-456',
      name: 'Minimal Community',
      description: null,
      organizer_id: 'user-456',
      parent_id: null,
      center: null,
      radius_km: null,
      hierarchy_path: null,
      time_zone: 'UTC',
      member_count: 1,
      deleted_at: '2024-01-15T00:00:00Z',
      deleted_by: 'admin-123',
    });

    // Act
    const result = toCommunityInfo(dbCommunity);

    // Assert
    expect(result.name).toBe('Minimal Community');
    expect(result.description).toBeUndefined();
    expect(result.organizerId).toBe('user-456');
    expect(result.parentId).toBeNull();
    expect(result.center).toBeUndefined();
    expect(result.radiusKm).toBeUndefined();
    expect(result.hierarchyPath).toEqual([]);
    expect(result.timeZone).toBe('UTC');
    expect(result.memberCount).toBe(1);
    expect(result.deletedAt).toEqual(new Date('2024-01-15T00:00:00Z'));
    expect(result.deletedBy).toBe('admin-123');

    // Verify no snake_case leakage
    assertNoSnakeCaseProperties(result, [
      ...COMMON_SNAKE_CASE_PROPERTIES.ENTITY_FIELDS,
      ...COMMON_SNAKE_CASE_PROPERTIES.USER_COMMUNITY_FIELDS,
      ...COMMON_SNAKE_CASE_PROPERTIES.COMMUNITY_FIELDS,
    ]);
  });
});
