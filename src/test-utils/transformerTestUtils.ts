import { expect } from 'vitest';

/**
 * Asserts that a transformed object does not contain snake_case properties
 * This is a common pattern in transformer tests to ensure proper camelCase conversion
 * 
 * @param result - The transformed object to test
 * @param snakeCaseProperties - Array of snake_case property names to check for absence
 * 
 * @example
 * ```typescript
 * const result = toCommunityInfo(dbCommunity);
 * assertNoSnakeCaseProperties(result, [
 *   'organizer_id', 'community_id', 'created_at', 'updated_at'
 * ]);
 * ```
 */
export function assertNoSnakeCaseProperties(
  result: Record<string, unknown>,
  snakeCaseProperties: string[]
): void {
  snakeCaseProperties.forEach(property => {
    expect(result).not.toHaveProperty(property);
  });
}

/**
 * Common snake_case properties found in database entities
 * Use these constants to avoid typos and maintain consistency
 */
export const COMMON_SNAKE_CASE_PROPERTIES = {
  /** Standard entity timestamps and IDs */
  ENTITY_FIELDS: [
    'created_at',
    'updated_at',
    'deleted_at',
    'deleted_by'
  ],
  
  /** User/Community relationship fields */
  USER_COMMUNITY_FIELDS: [
    'organizer_id',
    'community_id',
    'user_id',
    'owner_id'
  ],
  
  /** Event-specific fields */
  EVENT_FIELDS: [
    'start_date_time',
    'end_date_time',
    'parking_info',
    'max_attendees',
    'registration_required',
    'is_active',
    'image_urls',
    'attendee_count'
  ],
  
  /** Community-specific fields */
  COMMUNITY_FIELDS: [
    'parent_id',
    'radius_km',
    'hierarchy_path',
    'time_zone',
    'member_count'
  ],
  
  /** Resource-specific fields */
  RESOURCE_FIELDS: [
    'resource_type',
    'contact_info',
    'operating_hours',
    'is_verified'
  ]
} as const;

/**
 * Asserts common entity fields don't have snake_case leakage
 * Covers the most frequently tested properties across all transformers
 * 
 * @param result - The transformed object to test
 * @param additionalProperties - Additional snake_case properties specific to the entity
 * 
 * @example
 * ```typescript
 * const result = toEventInfo(dbEvent);
 * assertCommonSnakeCaseProperties(result, [
 *   'start_date_time', 'end_date_time', 'max_attendees'
 * ]);
 * ```
 */
export function assertCommonSnakeCaseProperties(
  result: Record<string, unknown>,
  additionalProperties: string[] = []
): void {
  const commonProperties = [
    ...COMMON_SNAKE_CASE_PROPERTIES.ENTITY_FIELDS,
    ...COMMON_SNAKE_CASE_PROPERTIES.USER_COMMUNITY_FIELDS,
    ...additionalProperties
  ];
  
  assertNoSnakeCaseProperties(result, commonProperties);
}

/**
 * Type-safe property assertion helper for transformer tests
 * Ensures the result has expected camelCase properties and not snake_case ones
 * 
 * @param result - The transformed object to test
 * @param expectedProperties - Object mapping camelCase properties to expected values
 * @param forbiddenProperties - Array of snake_case properties that should not exist
 * 
 * @example
 * ```typescript
 * assertTransformerProperties(result, {
 *   organizerId: 'user-123',
 *   communityId: 'community-456',
 *   createdAt: expect.any(Date)
 * }, ['organizer_id', 'community_id', 'created_at']);
 * ```
 */
export function assertTransformerProperties<T extends Record<string, unknown>>(
  result: Record<string, unknown>,
  expectedProperties: Partial<T>,
  forbiddenProperties: string[]
): void {
  // Assert expected camelCase properties exist with correct values
  Object.entries(expectedProperties).forEach(([key, value]) => {
    if (value === undefined) {
      expect(result).toHaveProperty(key, undefined);
    } else {
      expect(result).toHaveProperty(key, value);
    }
  });
  
  // Assert forbidden snake_case properties don't exist
  assertNoSnakeCaseProperties(result, forbiddenProperties);
}